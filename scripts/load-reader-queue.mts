import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: {
  rpm: { type: "string", default: "60" },
  seconds: { type: "string", default: "30" },
  workers: { type: "string", default: "4" },
  delay: { type: "string", default: "2000" }
} });
const rpm = Number(values.rpm);
const seconds = Number(values.seconds);
const slots = Number(values.workers);
const modelMs = Number(values.delay);
if (!Number.isInteger(rpm) || rpm < 1 || rpm > 600 ||
    !Number.isInteger(seconds) || seconds < 1 || seconds > 300 ||
    !Number.isInteger(slots) || slots < 1 || slots > 32 ||
    !Number.isInteger(modelMs) || modelMs < 0 || modelMs > 30_000) {
  throw new Error("Invalid load test settings.");
}
const address = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1", "[::1]"].includes(address.hostname)) throw new Error("Use a local PostgreSQL database.");
const schema = "reader_load_" + randomUUID().replaceAll("-", "");
address.searchParams.set("schema", schema);
process.env.DATABASE_URL = address.href;
process.env.AGENT_WORKER_SECRET = randomUUID() + randomUUID();
process.env.READER_AI_5H_BUDGET = "100000000";
process.env.READER_AI_WEEKLY_BUDGET = "100000000";
const { db } = await import("../src/lib/db");
let draining = false;
const started = new Map<string, number>();
const admissionMs: number[] = [];
const waitMs: number[] = [];
const totalMs: number[] = [];
const failures: string[] = [];
const now = () => performance.now();
const round = (samples: number[]) => samples.length ? Math.round([...samples].sort((a, b) => a - b)[Math.ceil(samples.length * 0.95) - 1]) : null;

try {
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { stdio: "pipe" });
  const { POST } = await import("../src/app/api/agent-worker/route");
  const { queueReaderTask, readReaderJob } = await import("../src/lib/ai/agent-queue");
  const { reserveReaderQuota, readReaderQuota } = await import("../src/lib/ai/reader-quota");
  const users = await Promise.all(Array.from({ length: 10 }, (_, index) =>
    db.user.create({ data: { email: "load-" + index + "@test.invalid" }, select: { id: true } })));
  const workerRequest = (action: string, body?: object) => POST(new Request("http://localhost/api/agent-worker?action=" + action + "&async=1&meter=1", {
    method: "POST", headers: { Authorization: "Bearer " + process.env.AGENT_WORKER_SECRET, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  }));

  async function worker() {
    while (!draining || totalMs.length + failures.length < started.size) {
      if (now() > deadline) throw new Error("Timed out draining the test queue");
      const response = await workerRequest("claim");
      if (response.status === 204) { await sleep(120); continue; }
      if (!response.ok) throw new Error("Claim failed " + response.status);
      const { id, lease, background } = await response.json();
      if (!background || !started.has(id)) throw new Error("Unexpected claimed job");
      waitMs.push(now() - started.get(id)!);
      await sleep(modelMs);
      const done = await workerRequest("finish", { id, lease, answer: "Simulated answer", usageUnits: 400 });
      if (done.ok) totalMs.push(now() - started.get(id)!);
      else failures.push("Finish " + done.status);
    }
  }

  const deadline = now() + seconds * 1000 + Math.max(30_000, modelMs * 4);
  const processes = Array.from({ length: slots }, () => worker().catch(error => { failures.push(String(error)); }));
  const count = Math.max(1, Math.floor(rpm * seconds / 60));
  const start = now();
  for (let index = 0; index < count; index++) {
    await sleep(Math.max(0, start + index * 60_000 / rpm - now()));
    const user = users[index % users.length];
    const id = randomUUID();
    started.set(id, now());
    try {
      const { reservation } = await reserveReaderQuota(user.id, 300);
      if (!reservation) throw new Error("Quota exhausted");
      await queueReaderTask(user.id, "Explain this sample.", new AbortController().signal, undefined, {
        jobId: id, reservation, userMessage: "Explain this sample."
      });
      admissionMs.push(now() - started.get(id)!);
      if (index === 0 && await readReaderJob(users[1].id, id)) throw new Error("Job visible to other owner");
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "Admission failed");
    }
  }
  draining = true;
  await Promise.all(processes);
  const quotaTotal = (await Promise.all(users.map(user => readReaderQuota(user.id))))
    .reduce((sum, quota) => sum + quota.short.used, 0);
  if (!failures.length && quotaTotal !== totalMs.length * 400) failures.push("Usage settlement mismatch");
  console.log(JSON.stringify({
    targetRpm: rpm, submitted: count, accepted: admissionMs.length, completed: totalMs.length,
    workers: slots, simulatedModelMs: modelMs, p95AdmissionMs: round(admissionMs),
    p95TimeToClaimMs: round(waitMs), p95EndToEndMs: round(totalMs), failures
  }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await db.$executeRawUnsafe('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
  await db.$disconnect();
}
