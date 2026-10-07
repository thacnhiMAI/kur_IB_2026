import { db } from "@/lib/db";

export class AuthRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many attempts");
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function assertAuthRateLimit(input: {
  key: string;
  maxAttempts?: number;
  windowMs?: number;
  blockMs?: number;
}) {
  const maxAttempts = input.maxAttempts ?? 8;
  const windowMs = input.windowMs ?? 15 * 60 * 1000;
  const blockMs = input.blockMs ?? 15 * 60 * 1000;
  const now = new Date();
  const current = await db.authRateLimit.findUnique({ where: { key: input.key } });

  if (current?.blockedUntil && current.blockedUntil.getTime() > now.getTime()) {
    throw new AuthRateLimitError(
      Math.max(1, Math.ceil((current.blockedUntil.getTime() - now.getTime()) / 1000))
    );
  }

  if (!current || now.getTime() - current.windowStartedAt.getTime() >= windowMs) {
    await db.authRateLimit.upsert({
      where: { key: input.key },
      create: { key: input.key, count: 1, windowStartedAt: now },
      update: { count: 1, windowStartedAt: now, blockedUntil: null }
    });
    return;
  }

  const nextCount = current.count + 1;
  const blockedUntil = nextCount > maxAttempts ? new Date(now.getTime() + blockMs) : null;

  await db.authRateLimit.update({
    where: { key: input.key },
    data: { count: nextCount, blockedUntil }
  });

  if (blockedUntil) {
    throw new AuthRateLimitError(Math.ceil(blockMs / 1000));
  }
}

export async function clearAuthRateLimit(key: string) {
  await db.authRateLimit.delete({ where: { key } }).catch(() => undefined);
}
