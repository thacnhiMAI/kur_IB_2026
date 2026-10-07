import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";

const schema = z.object({ name: z.string().trim().min(2, "Имя слишком короткое.").max(80, "Имя слишком длинное.") });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.accessBlocked) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Проверьте имя." }, { status: 400 });

  const user = await db.user.update({ where: { id: session.user.id }, data: { name: parsed.data.name }, select: { name: true } });
  return NextResponse.json({ ok: true, name: user.name });
}
