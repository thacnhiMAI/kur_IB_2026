import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { upsertReadingProgress } from "@/lib/reading/actions";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    bookId?: string;
    contentId?: string | null;
    lastPage?: number;
    totalPages?: number;
  };

  if (!body.bookId || !body.lastPage || !body.totalPages) {
    return NextResponse.json({ error: "Missing reading progress payload" }, { status: 400 });
  }

  const progress = await upsertReadingProgress({
    userId: session.user.id,
    bookId: body.bookId,
    contentId: body.contentId ?? null,
    lastPage: body.lastPage,
    totalPages: body.totalPages
  });

  return NextResponse.json({
    progressPercent: progress.progressPercent,
    lastPage: progress.lastPage,
    totalPages: progress.totalPages,
    completedAt: progress.completedAt
  });
}
