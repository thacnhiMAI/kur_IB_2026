import { NextResponse } from "next/server";
import sharp from "sharp";

import { auth } from "@/auth";
import { db } from "@/lib/db";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.accessBlocked) return NextResponse.json({ ok: false }, { status: 401 });

  const data = await request.formData();
  const entry = data.get("avatar");
  if (!(entry instanceof File) || entry.size === 0) return NextResponse.json({ ok: false, message: "Выберите изображение." }, { status: 400 });
  if (entry.size > MAX_BYTES) return NextResponse.json({ ok: false, message: "Файл должен быть не больше 5 МБ." }, { status: 413 });
  if (!ALLOWED.has(entry.type)) return NextResponse.json({ ok: false, message: "Поддерживаются JPG, PNG и WebP." }, { status: 400 });

  const source = Buffer.from(await entry.arrayBuffer());
  const normalized = await sharp(source)
    .rotate()
    .resize(512, 512, { fit: "cover", position: "attention" })
    .webp({ quality: 86 })
    .toBuffer();

  const version = Date.now();
  const image = `/api/avatars/${session.user.id}?v=${version}`;

  await db.$transaction([
    db.userAvatar.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, data: normalized, mimeType: "image/webp" },
      update: { data: normalized, mimeType: "image/webp" }
    }),
    db.user.update({ where: { id: session.user.id }, data: { image } })
  ]);

  return NextResponse.json({ ok: true, image });
}
