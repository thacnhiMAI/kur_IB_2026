import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { IMAGE_JOB_PREFIX, type ReaderAttachment } from "@/lib/ai/reader-attachment";
import { modelUsageUnits } from "@/lib/ai/model-usage";
import { settleReaderQuota, type ReaderReservation } from "@/lib/ai/reader-quota";

export const queueId = z.string().uuid();
export class ReaderQueueFull extends Error {}

type ClosedJob = {
  ownerId: string;
  conversationId: string | null;
  userMessage: string | null;
  reservation: { shortStart: string; weekStart: string; units: number };
  prompt: string;
};

async function settle(tx: Prisma.TransactionClient, job: Pick<ClosedJob, "ownerId" | "reservation">, usage: number) {
  const { units, shortStart, weekStart } = job.reservation;
  await settleReaderQuota(job.ownerId, { units, shortStart: new Date(shortStart), weekStart: new Date(weekStart) }, usage, tx);
}

async function expireJobs(tx: Prisma.TransactionClient, ownerId?: string, id?: string) {
  const expired = await tx.$queryRaw<Array<Pick<ClosedJob, "ownerId" | "reservation">>>`
    UPDATE "AgentJob" AS target
    SET "status" = 'failed', "prompt" = '', "expiresAt" = now() + interval '30 minutes'
    FROM (
      SELECT "id", "ownerId", "reservation" FROM "AgentJob" WHERE "reservation" IS NOT NULL AND "status" IN ('queued','running')
        AND ("expiresAt" <= now() OR ("attempts" >= 2 AND "leaseUntil" <= now()))
        AND (${ownerId ?? null}::text IS NULL OR "ownerId" = ${ownerId ?? null})
        AND (${id ?? null}::uuid IS NULL OR "id" = ${id ?? null}::uuid)
      ORDER BY "ownerId", "id" FOR UPDATE SKIP LOCKED LIMIT 32
    ) AS old WHERE target."id" = old."id"
    RETURNING old."ownerId", old."reservation"
  `;
  for (const job of expired) await settle(tx, job, 0);
}

export async function queueReaderTask(
  ownerId: string, prompt: string, signal: AbortSignal, attachment: ReaderAttachment | undefined,
  context: { jobId: string; reservation: ReaderReservation; conversationId?: string; userMessage: string }
) {
  if (prompt.length > 24_000) throw new Error("Agent input too large");
  signal.throwIfAborted();
  const id = queueId.safeParse(context.jobId).data ?? randomUUID();
  const payload = attachment ? IMAGE_JOB_PREFIX + JSON.stringify({ prompt, attachment }) : prompt;
  const configured = Number(process.env.READER_QUEUE_CAPACITY);
  const capacity = Number.isInteger(configured) && configured > 0 && configured <= 500 ? configured : 100;
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(672919301)`;
    await expireJobs(tx);
    await tx.$executeRaw`DELETE FROM "AgentJob" WHERE "expiresAt" <= now() AND ("reservation" IS NULL OR "status" NOT IN ('queued','running'))`;
    const [{ count }] = await tx.$queryRaw<Array<{ count: number }>>`
      SELECT count(*)::int AS count FROM "AgentJob" WHERE "status" IN ('queued','running') AND "expiresAt" > now()
    `;
    if (count >= capacity) throw new ReaderQueueFull();
    signal.throwIfAborted();
    const inserted = await tx.$executeRaw`
      INSERT INTO "AgentJob" ("id", "ownerId", "prompt", "reservation", "conversationId", "userMessage", "expiresAt")
      VALUES (${id}::uuid, ${ownerId}, ${payload}, ${JSON.stringify(context.reservation)}::jsonb,
        ${context.conversationId ?? null}, ${context.userMessage}, now() + interval '10 minutes')
      ON CONFLICT DO NOTHING
    `;
    if (!inserted) throw new ReaderQueueFull();
  });
  return { jobId: id };
}

export async function readReaderJob(ownerId: string, id: string) {
  const read = () => db.$queryRaw<Array<{ status: string; answer: string | null; conversationId: string | null; stale: boolean }>>`
    SELECT "status", "answer", "conversationId",
      ("status" IN ('queued','running') AND ("expiresAt" <= now() OR COALESCE("attempts" >= 2 AND "leaseUntil" <= now(), false))) AS "stale"
    FROM "AgentJob" WHERE "id" = ${id}::uuid AND "ownerId" = ${ownerId} AND "reservation" IS NOT NULL
      AND ("status" IN ('queued','running') OR "expiresAt" > now())
  `;
  let [job] = await read();
  if (job?.stale) {
    await db.$transaction(tx => expireJobs(tx, ownerId, id));
    [job] = await read();
  }
  if (!job) return null;
  return { status: job.status, answer: job.answer, conversationId: job.conversationId };
}

export async function cancelReaderJob(ownerId: string, id: string) {
  return db.$transaction(async tx => {
    const [job] = await tx.$queryRaw<ClosedJob[]>`
      UPDATE "AgentJob" SET "status" = 'cancelled', "prompt" = '', "expiresAt" = now() + interval '30 minutes'
      WHERE "id" = ${id}::uuid AND "ownerId" = ${ownerId} AND "reservation" IS NOT NULL AND "status" IN ('queued','running')
      RETURNING "ownerId", "reservation", "conversationId", "userMessage", "prompt"
    `;
    if (job) await settle(tx, job, 0);
    return Boolean(job);
  });
}

export async function finishReaderJob(id: string, lease: string, answer: string | null, usageUnits?: number) {
  return db.$transaction(async tx => {
    const [job] = await tx.$queryRaw<ClosedJob[]>`
      WITH job AS (
        SELECT * FROM "AgentJob" WHERE "id" = ${id}::uuid AND "lease" = ${lease}::uuid
          AND "status" = 'running' AND "leaseUntil" > now() AND "expiresAt" > now()
          AND "reservation" IS NOT NULL FOR UPDATE
      )
      UPDATE "AgentJob" AS target
      SET "status" = ${answer ? "done" : "failed"}, "answer" = ${answer}, "usageUnits" = ${usageUnits ?? null},
        "prompt" = '', "expiresAt" = now() + interval '30 minutes'
      FROM job WHERE target."id" = job."id"
      RETURNING job."ownerId", job."reservation", job."conversationId", job."userMessage",
        CASE WHEN ${usageUnits ?? null}::integer IS NULL THEN job."prompt" ELSE '' END AS "prompt"
    `;
    if (!job) return false;
    const hasImage = job.prompt.startsWith(IMAGE_JOB_PREFIX);
    const prompt = hasImage ? (JSON.parse(job.prompt.slice(IMAGE_JOB_PREFIX.length)) as { prompt: string }).prompt : job.prompt;
    await settle(tx, job, usageUnits ?? (answer ? modelUsageUnits("", prompt, answer) + (hasImage ? 1200 : 0) : 0));
    if (answer && job.conversationId && job.userMessage) {
      const where = { id: job.conversationId, userId: job.ownerId };
      const updated = await tx.readerAiConversation.updateMany({ where, data: { updatedAt: new Date() } });
      if (updated.count) {
        await tx.readerAiMessage.createMany({ data: [
          { conversationId: job.conversationId, role: "user", content: job.userMessage },
          { conversationId: job.conversationId, role: "assistant", content: answer }
        ] });
      }
    }
    return true;
  });
}
