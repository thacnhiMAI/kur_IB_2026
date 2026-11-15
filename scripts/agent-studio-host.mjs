import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const requested = Number(process.env.AGENT_STUDIO_WORKERS);
const count = Number.isInteger(requested) && requested >= 1 && requested <= 4 ? requested : 2;
const configuredModelLimit = Number(process.env.AGENT_MODEL_CONCURRENCY);
const modelLimit = Number.isInteger(configuredModelLimit) && configuredModelLimit >= 1 && configuredModelLimit <= 64
  ? configuredModelLimit : 12;
const requestLimit = 4;
const share = (total, index) => Math.floor(total / count) + (index < total % count ? 1 : 0);
const records = [];
let stopping = false;

function emit(event) {
  process.stdout.write(JSON.stringify(event) + "\n");
}

for (let index = 0; index < count; index++) {
  const child = spawn(process.execPath, ["--import", "tsx", "scripts/local-agent.ts"], {
    windowsHide: true,
    env: { ...process.env,
      AGENT_PARALLEL_REQUESTS: String(share(requestLimit, index)),
      AGENT_MODEL_CONCURRENCY: String(Math.max(1, share(modelLimit, index)))
    },
    stdio: ["pipe", "pipe", "inherit"]
  });
  const record = { child, active: new Map(), limit: share(requestLimit, index), alive: true };
  records.push(record);
  child.stdin.on("error", () => {});
  createInterface({ input: child.stdout }).on("line", line => {
    let event;
    try { event = JSON.parse(line); } catch { return; }
    if (event.runId) {
      if (event.status === "running") record.active.set(event.runId, event);
      else record.active.delete(event.runId);
    }
    if (event.type !== "models" || index === 0) emit(event);
  });
  child.on("error", () => emit({ status: "failed", message: "Could not launch an Agent Studio worker." }));
  child.on("exit", () => {
    record.alive = false;
    if (!stopping) {
      for (const event of record.active.values()) emit({
        ...event, status: "failed", steps: event.steps.map(step => step.status === "running" || step.status === "queued"
          ? { ...step, status: "failed", error: "Worker disconnected" } : step)
      });
      record.active.clear();
      emit({ status: "failed", message: "An Agent Studio worker disconnected." });
    }
  });
}

const input = createInterface({ input: process.stdin });
const send = (record, command) => { if (record.alive) record.child.stdin.write(JSON.stringify(command) + "\n"); };

input.on("line", line => {
  let command;
  try { command = JSON.parse(line); } catch { return; }
  if (command.action === "parallel") {
    records.forEach((record, index) => {
      record.limit = share(command.limit, index);
      send(record, { action: "parallel", limit: record.limit });
    });
  } else if (command.action === "start") {
    const worker = records.filter(record => record.alive && record.active.size < record.limit)
      .sort((a,b) => (b.limit - b.active.size) - (a.limit - a.active.size))[0];
    if (worker) send(worker, command);
    else emit({ status: "busy", message: "Parallel request slots are full." });
  } else if (command.action === "cancel") {
    const worker = records.find(record => record.active.has(command.runId));
    if (worker) send(worker, command);
  } else {
    records.forEach(record => send(record, command));
  }
});
input.on("close", () => {
  stopping = true;
  for (const { child } of records) child.stdin.end();
});
