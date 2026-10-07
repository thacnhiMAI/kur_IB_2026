import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  bookId: z.string().min(1),
  contentId: z.string().nullable().optional(),
  scope: z.enum(["page", "document"]),
  page: z.number().int().positive().optional()
}).refine((value) => value.scope === "document" || Boolean(value.page), {
  message: "Для разговора по странице нужен номер страницы."
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

  const conversations = await db.readerAiConversation.findMany({
    where: { userId, bookId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 80 }
    }
  });

  return NextResponse.json({ ok: true, conversations });
}

export async function POST(request: Request) {
  const userId = await viewerId();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Некорректный запрос." }, { status: 400 });

  const book = await db.book.findUnique({ where: { id: parsed.data.bookId }, select: { id: true } });
  if (!book) return NextResponse.json({ ok: false }, { status: 404 });
  if (parsed.data.contentId) {
    const content = await db.bookContent.findFirst({ where: { id: parsed.data.contentId, bookId: parsed.data.bookId }, select: { id: true } });
    if (!content) return NextResponse.json({ ok: false, message: "PDF content does not belong to this book." }, { status: 400 });
  }

  const conversation = await db.readerAiConversation.create({
    data: {
      userId,
      bookId: parsed.data.bookId,
      contentId: parsed.data.contentId ?? null,
      scope: parsed.data.scope,
      page: parsed.data.scope === "page" ? parsed.data.page ?? null : null,
      title: parsed.data.scope === "page" ? `Страница ${parsed.data.page}` : "PDF"
    },
    include: { messages: true }
  });

  return NextResponse.json({ ok: true, conversation });
}

export async function DELETE(request: Request) {
  const userId = await viewerId();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const deleted = await db.readerAiConversation.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: deleted.count > 0 });
}
