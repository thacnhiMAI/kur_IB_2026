import crypto from "node:crypto";

import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email/mailer";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function codeSecret() {
  return process.env.AUTH_SECRET || "dev-only-auth-secret-change-me";
}

function hashCode(email: string, purpose: "SIGN_UP" | "PASSWORD_RESET", code: string) {
  return crypto
    .createHmac("sha256", codeSecret())
    .update(`${normalizeEmail(email)}:${purpose}:${code}`)
    .digest("hex");
}

function makeCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export async function issueVerificationCode(input: {
  email: string;
  purpose: "SIGN_UP" | "PASSWORD_RESET";
  enforceCooldown?: boolean;
}) {
  const email = normalizeEmail(input.email);
  const now = new Date();
  const current = await db.emailVerificationCode.findUnique({
    where: { email_purpose: { email, purpose: input.purpose } }
  });

  if (input.enforceCooldown !== false && current) {
    const elapsed = now.getTime() - current.lastSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      return {
        ok: false as const,
        retryAfterSeconds: Math.max(1, Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000))
      };
    }
  }

  const code = makeCode();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);

  await db.emailVerificationCode.upsert({
    where: { email_purpose: { email, purpose: input.purpose } },
    create: {
      email,
      purpose: input.purpose,
      codeHash: hashCode(email, input.purpose, code),
      expiresAt,
      lastSentAt: now,
      attempts: 0
    },
    update: {
      codeHash: hashCode(email, input.purpose, code),
      expiresAt,
      lastSentAt: now,
      attempts: 0
    }
  });

  try {
    const delivery = await sendVerificationEmail({ to: email, code, purpose: input.purpose });
    return {
      ok: true as const,
      expiresInSeconds: Math.floor(CODE_TTL_MS / 1000),
      resendAfterSeconds: Math.floor(RESEND_COOLDOWN_MS / 1000),
      delivery: delivery.delivery
    };
  } catch (error) {
    await db.emailVerificationCode.delete({
      where: { email_purpose: { email, purpose: input.purpose } }
    }).catch(() => undefined);
    throw error;
  }
}

export async function verifyEmailCode(input: {
  email: string;
  purpose: "SIGN_UP" | "PASSWORD_RESET";
  code: string;
}) {
  const email = normalizeEmail(input.email);
  const record = await db.emailVerificationCode.findUnique({
    where: { email_purpose: { email, purpose: input.purpose } }
  });

  if (!record || record.expiresAt.getTime() <= Date.now()) {
    return { ok: false as const, reason: "expired" as const };
  }

  if (record.attempts >= MAX_CODE_ATTEMPTS) {
    return { ok: false as const, reason: "too_many_attempts" as const };
  }

  const expected = Buffer.from(record.codeHash, "hex");
  const actual = Buffer.from(hashCode(email, input.purpose, input.code.trim()), "hex");
  const valid = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

  if (!valid) {
    await db.emailVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } }
    });
    return { ok: false as const, reason: "invalid" as const };
  }

  await db.emailVerificationCode.delete({ where: { id: record.id } });
  return { ok: true as const };
}
