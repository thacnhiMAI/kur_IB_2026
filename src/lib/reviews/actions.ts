"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { reviewSchema } from "@/lib/validators/review";

export async function upsertReview(input: {
  bookId: string;
  rating: number;
  content: string;
  redirectSlug?: string;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const parsed = reviewSchema.parse({
    rating: input.rating,
    content: input.content
  });

  const review = await db.review.upsert({
    where: {
      userId_bookId: {
        userId: session.user.id,
        bookId: input.bookId
      }
    },
    create: {
      userId: session.user.id,
      bookId: input.bookId,
      rating: parsed.rating,
      content: parsed.content
    },
    update: {
      rating: parsed.rating,
      content: parsed.content
    }
  });

  if (input.redirectSlug) {
    revalidatePath(`/books/${input.redirectSlug}`);
  }

  return review;
}
