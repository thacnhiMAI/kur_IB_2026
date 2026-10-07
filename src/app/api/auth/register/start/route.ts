import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { issueVerificationCode } from "@/lib/auth/email-verification";
import { db } from "@/lib/db";
import { signUpSchema } from "@/lib/validators/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signUpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Проверьте данные." },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;
  const existing = await db.user.findUnique({
    where: { email },
    include: { accounts: { select: { id: true }, take: 1 } }
  });

  if (existing?.emailVerified || (existing?.accounts.length ?? 0) > 0) {
    return NextResponse.json(
      { ok: false, code: "ACCOUNT_EXISTS", message: "Аккаунт с этим email уже существует. Войдите в него." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: { name, passwordHash }
    });
  } else {
    await db.user.create({
      data: { name, email, passwordHash, role: "USER" }
    });
  }

  try {
    const result = await issueVerificationCode({ email, purpose: "SIGN_UP" });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: "RESEND_COOLDOWN",
          retryAfterSeconds: result.retryAfterSeconds,
          message: `Повторная отправка будет доступна через ${result.retryAfterSeconds} сек.`
        },
        { status: 429 }
      );
    }

    return NextResponse.json({
      ok: true,
      email,
      resendAfterSeconds: result.resendAfterSeconds,
      expiresInSeconds: result.expiresInSeconds
    });
  } catch (error) {
    console.error("Failed to send verification email", error);
    return NextResponse.json(
      {
        ok: false,
        code: "EMAIL_DELIVERY_FAILED",
        message: "Не удалось отправить письмо. Проверьте SMTP-настройки и попробуйте ещё раз."
      },
      { status: 503 }
    );
  }
}
