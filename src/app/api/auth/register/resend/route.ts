import { NextResponse } from "next/server";

import { issueVerificationCode } from "@/lib/auth/email-verification";
import { db } from "@/lib/db";
import { emailOnlySchema } from "@/lib/validators/auth";

export async function POST(request: Request) {
  const parsed = emailOnlySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Введите корректный email." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || user.emailVerified) {
    return NextResponse.json(
      { ok: false, message: "Активная регистрация для этого email не найдена." },
      { status: 400 }
    );
  }

  try {
    const result = await issueVerificationCode({
      email: parsed.data.email,
      purpose: "SIGN_UP"
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          retryAfterSeconds: result.retryAfterSeconds,
          message: `Повторная отправка будет доступна через ${result.retryAfterSeconds} сек.`
        },
        { status: 429 }
      );
    }

    return NextResponse.json({
      ok: true,
      resendAfterSeconds: result.resendAfterSeconds,
      expiresInSeconds: result.expiresInSeconds
    });
  } catch (error) {
    console.error("Failed to resend verification email", error);
    return NextResponse.json({ ok: false, message: "Не удалось отправить письмо." }, { status: 503 });
  }
}
