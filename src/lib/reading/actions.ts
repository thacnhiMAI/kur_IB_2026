"use server";

import { db } from "@/lib/db";

export async function upsertReadingProgress({
  userId,
  bookId,
  contentId,
  lastPage,
  totalPages
}: {
  userId: string;
  bookId: string;
  contentId: string | null;
  lastPage: number;
  totalPages: number;
}) {
  const safeLastPage = Math.max(1, lastPage);
  const safeTotalPages = Math.max(1, totalPages);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((safeLastPage / safeTotalPages) * 100))
  );

  return db.readingProgress.upsert({
    where: {
      userId_bookId: {
        userId,
        bookId
      }
    },
    update: {
      contentId,
      lastPage: safeLastPage,
      totalPages: safeTotalPages,
      progressPercent,
      completedAt: progressPercent >= 100 ? new Date() : null
    },
    create: {
      userId,
      bookId,
      contentId,
      lastPage: safeLastPage,
      totalPages: safeTotalPages,
      progressPercent,
      completedAt: progressPercent >= 100 ? new Date() : null
    }
  });
}
