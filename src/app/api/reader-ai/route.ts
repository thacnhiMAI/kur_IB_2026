import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { answerReaderAi } from "@/lib/ai/reader-ai-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  action: z.enum(["summary", "explain", "questions", "ask"]),
  scope: z.enum(["page", "document"]).default("page"),
  title: z.string().trim().min(1).max(300),
  page: z.number().int().positive().max(100000).optional(),
  text: z.string().trim().min(1).max(2_000_000),
  question: z.string().trim().max(2000).optional(),
  conversationId: z.string().min(1).optional(),
  bookId: z.string().min(1).optional(),
  jobId: z.string().min(8).max(160)
});

const actionLabel: Record<"summary" | "explain" | "questions", string> = {
  summary: "Кратко перескажи этот материал.",
  explain: "Объясни этот материал простыми словами.",
  questions: "Составь вопросы для самопроверки по этому материалу."
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.accessBlocked) {
    return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некорректный запрос AI Reader." }, { status: 400 });

  const conversationId = parsed.data.conversationId;
  let history: Array<{ role: string; content: string }> = [];
  if (conversationId) {
    const conversation = await db.readerAiConversation.findFirst({
      where: { id: conversationId, userId: session.user.id },
      select: {
        id: true,
        bookId: true,
        messages: { orderBy: { createdAt: "asc" }, take: 20, select: { role: true, content: true } }
      }
    });
    if (!conversation || (parsed.data.bookId && conversation.bookId !== parsed.data.bookId)) {
      return NextResponse.json({ error: "Разговор AI не найден." }, { status: 404 });
    }
    history = conversation.messages;
  }

  try {
    const answer = await answerReaderAi({ ...parsed.data, history, jobId: parsed.data.jobId });
    if (conversationId) {
      const userMessage = parsed.data.action === "ask"
        ? parsed.data.question?.trim() || "Вопрос"
        : actionLabel[parsed.data.action];
      await db.$transaction([
        db.readerAiMessage.create({ data: { conversationId, role: "user", content: userMessage } }),
        db.readerAiMessage.create({ data: { conversationId, role: "assistant", content: answer } }),
        db.readerAiConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })
      ]);
    }
    return NextResponse.json({ answer, conversationId });
  } catch (error) {
    if (error instanceof Error && error.message === "Cancelled") {
      return NextResponse.json({ error: "Cancelled" }, { status: 499 });
    }
    console.error("Reader AI failed:", error);
    return NextResponse.json(
      { error: "AI Reader временно недоступен. Backend не смог запустить ни API, ни совместимую локальную модель." },
      { status: 503 }
    );
  }
}
