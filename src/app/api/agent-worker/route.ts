import { finishReaderJob } from "@/lib/ai/agent-queue";
import { IMAGE_JOB_PREFIX } from "@/lib/ai/reader-attachment";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";

const leaseKey = z.object({ id: z.string().uuid(), lease: z.string().uuid() }).strict();
const finish = leaseKey.extend({ answer: z.string().trim().min(1).max(16000).nullable(), usageUnits: z.number().int().min(0).max(10_000_000).optional() }).strict();

export async function POST(request: Request) {
  const secret = process.env.AGENT_WORKER_SECRET?.trim();
  const auth = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from("Bearer " + secret);
  if (!secret || secret.length < 32 || auth.length !== expected.length || !timingSafeEqual(auth, expected)) {
    return new Response(null, { status: 401 });
  }
  const query = new URL(request.url).searchParams;
  const type = query.get("action");
  const background = query.get("async") === "1";
  if (type === "claim") {
    const lease = randomUUID();
    const vision = query.get("vision") === "1";
    const [job] = await db.$queryRaw<Array<{ id: string; prompt: string; lease: string; background?: boolean }>>`
      UPDATE "AgentJob" SET "status" = 'running', "lease" = ${lease}::uuid,
        "leaseUntil" = now() + interval '48 seconds', "attempts" = "attempts" + 1
      WHERE "id" = (
        SELECT job."id" FROM "AgentJob" AS job
        WHERE job."expiresAt" > now() AND (${background} OR "reservation" IS NULL) AND (${vision} OR NOT starts_with("prompt", ${IMAGE_JOB_PREFIX})) AND ("status" = 'queued' OR
          ("status" = 'running' AND "leaseUntil" <= now() AND "attempts" < 2))
        ORDER BY (
          SELECT count(*) FROM "AgentJob" AS active
          WHERE active."ownerId" = job."ownerId" AND active."status" = 'running'
            AND active."leaseUntil" > now() AND active."expiresAt" > now()
        ), job."createdAt", job."id" FOR UPDATE OF job SKIP LOCKED LIMIT 1
      )
      RETURNING "id"::text, "prompt", "lease"::text, "reservation" IS NOT NULL AS background
    `;
    if (!job) return new Response(null, { status: 204 });
    const { background: isBackground, ...base } = job;
    const payload = {
      ...base,
      ...(isBackground ? { background: true } : {}),
      ...(job.prompt.startsWith(IMAGE_JOB_PREFIX) ? JSON.parse(job.prompt.slice(IMAGE_JOB_PREFIX.length)) : {})
    };
    return Response.json(query.get("meter") === "1" ? { ...payload, metering: true } : payload, { headers: { "Cache-Control": "no-store" } });
  }
  const renew = type === "renew" && (background || (process.env.NODE_ENV === "development" && process.env.AGENT_LOCAL_QUEUE === "1"));
  if ((!renew && type !== "finish") || !request.headers.get("content-type")?.startsWith("application/json")) return new Response(null, { status: 400 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 100_000) return new Response(null, { status: 413 });
  const body = await request.json().catch(() => null);
  if (renew) {
    const value = leaseKey.safeParse(body);
    if (!value.success) return new Response(null, { status: 400 });
    const { id, lease } = value.data;
    const renewed = await db.$executeRaw`
      UPDATE "AgentJob" SET "leaseUntil" = now() + interval '48 seconds',
        "expiresAt" = CASE WHEN "reservation" IS NOT NULL THEN now() + interval '3 minutes' ELSE "expiresAt" END
      WHERE "id" = ${id}::uuid AND "lease" = ${lease}::uuid AND "status" = 'running'
        AND "leaseUntil" > now() AND "expiresAt" > now()
    `;
    return new Response(null, { status: renewed ? 204 : 409 });
  }
  const value = finish.safeParse(body);
  if (!value.success) return new Response(null, { status: 400 });
  const { id, lease, answer, usageUnits } = value.data;
  if (background) {
    return new Response(null, { status: await finishReaderJob(id, lease, answer, usageUnits) ? 204 : 409 });
  }
  const status = answer ? "done" : "failed";
  const updated = await db.$executeRaw`
    UPDATE "AgentJob" SET "status" = ${status}, "answer" = ${answer}, "usageUnits" = ${usageUnits ?? null}, "prompt" = ''
    WHERE "id" = ${id}::uuid AND "lease" = ${lease}::uuid AND "status" = 'running'
      AND "leaseUntil" > now() AND "expiresAt" > now() AND "reservation" IS NULL
  `;
  return new Response(null, { status: updated ? 204 : 409 });
}
