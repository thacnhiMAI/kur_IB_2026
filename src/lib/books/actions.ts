"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { toggleFavorite } from "@/lib/favorites/actions";
import { recordReadingEvent } from "@/lib/reading-history/actions";
import { refreshRecommendationSnapshotForUser } from "@/lib/recommendations/refresh";
import { upsertReview } from "@/lib/reviews/actions";

function requireString(value: FormDataEntryValue | null, field: string) {
  const parsed = String(value ?? "").trim();

  if (!parsed) {
    throw new Error(`Missing ${field}`);
  }

  return parsed;
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

  await upsertReview({
    bookId,
    rating,
    content,
    redirectSlug
  });
  await refreshRecommendationSnapshotForUser(user.id, "review");

  revalidatePath("/recommendations");
}
