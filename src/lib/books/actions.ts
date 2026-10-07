"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";

import { requireUser } from "@/lib/auth";
import { toggleFavorite } from "@/lib/favorites/actions";
import { recordReadingEvent } from "@/lib/reading-history/actions";
import { refreshRecommendationSnapshotForUser } from "@/lib/recommendations/refresh";
import { createReview } from "@/lib/reviews/actions";

function requireString(value: FormDataEntryValue | null, field: string) {
  const parsed = String(value ?? "").trim();
  if (!parsed) throw new Error(`Missing ${field}`);
  return parsed;
}

export async function recordBookViewForRecommendations(slug: string) {
  const session = await auth();
  if (!session?.user?.id || session.user.accessBlocked || typeof slug !== "string" || slug.length > 300) return;
  const book = await db.book.findFirst({ where: { slug, isPublished: true }, select: { id: true } });
  if (!book) return;
  const recent = await db.readingHistory.findFirst({
    where: { userId: session.user.id, bookId: book.id, eventType: "VIEWED", createdAt: { gte: new Date(Date.now() - 10 * 60_000) } },
    select: { id: true }
  });
  if (!recent) await db.readingHistory.create({ data: { userId: session.user.id, bookId: book.id, eventType: "VIEWED" } });
}

export async function toggleFavoriteForBook(formData: FormData) {
  const user = await requireUser();
  const bookId = requireString(formData.get("bookId"), "bookId");
  const slug = requireString(formData.get("slug"), "slug");
  await toggleFavorite(bookId);
  await refreshRecommendationSnapshotForUser(user.id, "favorite");
  revalidatePath("/favorites");
  revalidatePath("/recommendations");
  revalidatePath(`/books/${slug}`);
}

export async function recordBookInterest(formData: FormData) {
  const user = await requireUser();
  const bookId = requireString(formData.get("bookId"), "bookId");
  const slug = requireString(formData.get("slug"), "slug");
  await recordReadingEvent(bookId, "interest");
  await refreshRecommendationSnapshotForUser(user.id, "interest");
  revalidatePath("/recommendations");
  revalidatePath(`/books/${slug}`);
}

export async function recordBookFinished(formData: FormData) {
  const user = await requireUser();
  const bookId = requireString(formData.get("bookId"), "bookId");
  const slug = requireString(formData.get("slug"), "slug");
  await recordReadingEvent(bookId, "finished");
  await refreshRecommendationSnapshotForUser(user.id, "finished");
  revalidatePath("/recommendations");
  revalidatePath(`/books/${slug}`);
}

export async function submitBookReview(formData: FormData) {
  const user = await requireUser();
  const rating = Number(formData.get("rating"));
  const content = String(formData.get("content") ?? "");
  const bookId = requireString(formData.get("bookId"), "bookId");
  const redirectSlug = requireString(formData.get("slug"), "slug");

  await createReview({ bookId, rating, content, redirectSlug });
  // A pending review is still a private preference signal for its author. It
  // does not become public until moderation approves it.
  await refreshRecommendationSnapshotForUser(user.id, "review");
  revalidatePath("/recommendations");
  revalidatePath(`/books/${redirectSlug}`);
}
