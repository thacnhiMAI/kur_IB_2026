"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notifyAdmins } from "@/lib/notifications/service";
import { reviewSchema } from "@/lib/validators/review";

export async function createReview(input: {
  bookId: string;
  rating: number;
  content: string;
  redirectSlug?: string;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.accessBlocked) throw new Error("Unauthorized");

  const parsed = reviewSchema.parse({ rating: input.rating, content: input.content });
  const book = await db.book.findUnique({
    where: { id: input.bookId },
    select: { id: true, title: true, slug: true }
  });
  if (!book) throw new Error("Book not found");

  // Every submission is an independent moderated item. A reader can submit a
  // new review while older submissions are still pending.
  const review = await db.review.create({
    data: {
      userId: session.user.id,
      bookId: input.bookId,
      rating: parsed.rating,
      content: parsed.content,
      status: "PENDING"
    }
  });

  await notifyAdmins({
    type: "REVIEW_PENDING",
    title: "Новый отзыв на модерации",
    body: `Поступил новый отзыв на «${book.title}».`,
    href: "/admin/reviews",
    excludeUserId: session.user.role === "ADMIN" ? session.user.id : undefined
  });

  revalidatePath(`/books/${input.redirectSlug ?? book.slug}`);
  revalidatePath("/admin/reviews");
  return review;
}
