import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { issueVerificationCode } from "@/lib/auth/email-verification";
import { db } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.accessBlocked) return NextResponse.json({ ok: false }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { email: true, emailVerified: true } });
  if (!user?.email || !user.emailVerified) return NextResponse.json({ ok: false, message: "Сначала подтвердите email аккаунта." }, { status: 400 });

  try {
    const result = await issueVerificationCode({ email: user.email, purpose: "PASSWORD_RESET" });
    if (!result.ok) {
      return NextResponse.json({ ok: false, retryAfterSeconds: result.retryAfterSeconds, message: `Повторная отправка будет доступна через ${result.retryAfterSeconds} сек.` }, { status: 429 });
    }
    return NextResponse.json({ ok: true, email: user.email, resendAfterSeconds: result.resendAfterSeconds, expiresInSeconds: result.expiresInSeconds });
  } catch (error) {
    console.error("Failed to send password verification code", error);
    return NextResponse.json({ ok: false, message: "Не удалось отправить код. Проверьте SMTP-настройки." }, { status: 503 });
  }
}
