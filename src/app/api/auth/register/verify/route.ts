import { NextResponse } from "next/server";

import { verifyEmailCode } from "@/lib/auth/email-verification";
import { db } from "@/lib/db";
import { verificationCodeSchema } from "@/lib/validators/auth";

export async function POST(request: Request) {
  const parsed = verificationCodeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "INVALID_CODE_FORMAT", message: "Введите шестизначный код." },
      { status: 400 }
    );
  }

  const result = await verifyEmailCode({
    email: parsed.data.email,
    code: parsed.data.code,
    purpose: "SIGN_UP"
  });

  if (!result.ok) {
    const messages = {
      expired: "Код истёк. Запросите новый.",
      invalid: "Неверный код подтверждения.",
      too_many_attempts: "Слишком много неверных попыток. Запросите новый код."
    } as const;

    return NextResponse.json(
      { ok: false, code: result.reason.toUpperCase(), message: messages[result.reason] },
      { status: result.reason === "invalid" ? 400 : 429 }
    );
  }

  await db.user.update({
    where: { email: parsed.data.email },
    data: { emailVerified: new Date() }
  });

  return NextResponse.json({ ok: true });
}
