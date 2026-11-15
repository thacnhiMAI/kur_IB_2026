import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const shortMs = 5 * 60 * 60 * 1000;
const weekMs = 7 * 24 * 60 * 60 * 1000;
type UsageRow = { shortStart: Date; weekStart: Date; shortUsed: number; weekUsed: number };
export type ReaderReservation = Pick<UsageRow, "shortStart" | "weekStart"> & { units: number };

function budget(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 && value <= 100_000_000 ? value : fallback;
}

function windowState(start: Date | undefined, used: number | undefined, duration: number, now: Date, limit: number) {
  const expiration = start ? start.getTime() + duration : 0;
  const live = expiration > now.getTime();
  return { used: live ? used ?? 0 : 0, limit, resetsAt: live ? new Date(expiration).toISOString() : null };
}

function describeUsage(row: UsageRow | undefined, now: Date) {
  return {
    short: windowState(row?.shortStart, row?.shortUsed, shortMs, now, budget("READER_AI_5H_BUDGET", 120_000)),
    week: windowState(row?.weekStart, row?.weekUsed, weekMs, now, budget("READER_AI_WEEKLY_BUDGET", 650_000))
  };
}

export async function readReaderQuota(userId: string) {
  const [row] = await db.$queryRaw<UsageRow[]>`
    SELECT "shortStart", "shortUsed", "weekStart", "weekUsed" FROM "ReaderAiBudget" WHERE "userId" = ${userId}
  `;
  return describeUsage(row, new Date());
}

export async function reserveReaderQuota(userId: string, units: number) {
  return db.$transaction(async tx => {
    // Lock one user's counters so concurrent requests cannot oversubscribe either window.
    const started = new Date();
    const empty = describeUsage(undefined, started);
    if (units > empty.short.limit || units > empty.week.limit) {
      return { quota: empty, reservation: null };
    }
    await tx.$executeRaw`
      INSERT INTO "ReaderAiBudget" ("userId", "shortStart", "shortUsed", "weekStart", "weekUsed")
      VALUES (${userId}, ${started}, 0, ${started}, 0) ON CONFLICT DO NOTHING
    `;
    const [row] = await tx.$queryRaw<UsageRow[]>`
      SELECT "shortStart", "shortUsed", "weekStart", "weekUsed"
      FROM "ReaderAiBudget" WHERE "userId" = ${userId} FOR UPDATE
    `;
    const now = new Date();
    const quota = describeUsage(row, now);
    if (quota.short.used + units > quota.short.limit || quota.week.used + units > quota.week.limit) {
      return { quota, reservation: null };
    }
    const shortStart = quota.short.resetsAt ? row.shortStart : now;
    const weekStart = quota.week.resetsAt ? row.weekStart : now;
    await tx.$executeRaw`
      UPDATE "ReaderAiBudget" SET "shortStart" = ${shortStart}, "weekStart" = ${weekStart},
        "shortUsed" = ${quota.short.used + units}, "weekUsed" = ${quota.week.used + units}
      WHERE "userId" = ${userId}
    `;
    return { quota, reservation: { shortStart, weekStart, units } };
  });
}

export async function settleReaderQuota(userId: string, reservation: ReaderReservation, actualUnits: number, tx: Prisma.TransactionClient = db) {
  const difference = actualUnits - reservation.units;
  if (!difference) return;
  await tx.$executeRaw`
    UPDATE "ReaderAiBudget" SET
      "shortUsed" = CASE WHEN "shortStart" = ${reservation.shortStart} THEN GREATEST(0, "shortUsed" + ${difference}::integer) ELSE "shortUsed" END,
      "weekUsed" = CASE WHEN "weekStart" = ${reservation.weekStart} THEN GREATEST(0, "weekUsed" + ${difference}::integer) ELSE "weekUsed" END
    WHERE "userId" = ${userId}
  `;
}
