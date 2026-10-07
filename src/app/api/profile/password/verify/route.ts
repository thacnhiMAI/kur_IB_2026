import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { verifyEmailCode } from "@/lib/auth/email-verification";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications/service";
import { passwordSchema } from "@/lib/validators/auth";

const schema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Введите шестизначный код."),
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Пароли не совпадают." });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.accessBlocked) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Проверьте данные." }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
  if (!user?.email) return NextResponse.json({ ok: false, message: "Email аккаунта не найден." }, { status: 400 });

  const verified = await verifyEmailCode({ email: user.email, purpose: "PASSWORD_RESET", code: parsed.data.code });
  if (!verified.ok) {
    const messages = { expired: "Код истёк. Запросите новый.", invalid: "Неверный код.", too_many_attempts: "Слишком много попыток. Запросите новый код." } as const;
    return NextResponse.json({ ok: false, message: messages[verified.reason] }, { status: verified.reason === "invalid" ? 400 : 429 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.user.update({ where: { id: session.user.id }, data: { passwordHash } });
  await createNotification({ userId: session.user.id, type: "SECURITY_PASSWORD_CHANGED", title: "Пароль изменён", body: "Пароль вашего аккаунта был успешно изменён." });
  return NextResponse.json({ ok: true });
}
