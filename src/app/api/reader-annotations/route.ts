import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";

const rectSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1)
});

const createSchema = z.object({
  bookId: z.string().min(1),
  contentId: z.string().nullable().optional(),
  page: z.number().int().positive(),
  quote: z.string().trim().max(5000).nullable().optional(),
  note: z.string().trim().max(5000).nullable().optional(),
  rects: z.array(rectSchema).max(32).optional(),
  color: z.enum(["yellow", "cyan", "rose"]).default("yellow")
}).refine((value) => Boolean(value.quote?.trim() || value.note?.trim() || value.rects?.length), { message: "Добавьте выделение или заметку." });

const updateSchema = z.object({
  id: z.string().min(1),
  note: z.string().trim().max(5000).nullable().optional(),
  color: z.enum(["yellow", "cyan", "rose"]).optional()
});

async function viewerId() {
  const session = await auth();
  return session?.user?.id && !session.user.accessBlocked ? session.user.id : null;
}

export async function GET(request: Request) {
  const userId = await viewerId();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const bookId = new URL(request.url).searchParams.get("bookId");
  if (!bookId) return NextResponse.json({ ok: false }, { status: 400 });

  const annotations = await db.readerAnnotation.findMany({
    where: { userId, bookId },
    orderBy: [{ page: "asc" }, { createdAt: "asc" }]
  });
  return NextResponse.json({ ok: true, annotations });
}

export async function POST(request: Request) {
  const userId = await viewerId();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Проверьте заметку." }, { status: 400 });

  const book = await db.book.findUnique({ where: { id: parsed.data.bookId }, select: { id: true } });
  if (!book) return NextResponse.json({ ok: false }, { status: 404 });

  if (parsed.data.contentId) {
    const content = await db.bookContent.findFirst({ where: { id: parsed.data.contentId, bookId: parsed.data.bookId }, select: { id: true } });
    if (!content) return NextResponse.json({ ok: false, message: "PDF content does not belong to this book." }, { status: 400 });
  }

  const annotation = await db.readerAnnotation.create({
    data: {
      userId,
      bookId: parsed.data.bookId,
      contentId: parsed.data.contentId ?? null,
      page: parsed.data.page,
      quote: parsed.data.quote?.trim() || null,
      note: parsed.data.note?.trim() || null,
      rects: parsed.data.rects ?? undefined,
      color: parsed.data.color
    }
  });
  return NextResponse.json({ ok: true, annotation });
}

export async function PATCH(request: Request) {
  const userId = await viewerId();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Некорректное изменение заметки." }, { status: 400 });

  const existing = await db.readerAnnotation.findFirst({
    where: { id: parsed.data.id, userId },
    select: { id: true }
  });
  if (!existing) return NextResponse.json({ ok: false }, { status: 404 });

  const annotation = await db.readerAnnotation.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.note !== undefined ? { note: parsed.data.note?.trim() || null } : {}),
      ...(parsed.data.color ? { color: parsed.data.color } : {})
    }
  });
  return NextResponse.json({ ok: true, annotation });
}

export async function DELETE(request: Request) {
  const userId = await viewerId();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const deleted = await db.readerAnnotation.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: deleted.count > 0 });
}
