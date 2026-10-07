"use server";

import type { ReviewStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { logAdminAction } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications/service";

const allowedStatuses = new Set<ReviewStatus>(["PENDING", "PUBLISHED", "HIDDEN", "REJECTED"]);

function notificationForStatus(status: ReviewStatus, title: string) {
  if (status === "PUBLISHED") return { title: "Отзыв опубликован", body: `Ваш отзыв на «${title}» одобрен и теперь виден другим читателям.` };
  if (status === "REJECTED") return { title: "Отзыв отклонён", body: `Модератор отклонил ваш отзыв на «${title}». Вы можете отправить новый отзыв.` };
  if (status === "HIDDEN") return { title: "Отзыв скрыт", body: `Ваш отзыв на «${title}» скрыт модератором.` };
  return null;
}


async function refreshBookRating(bookId: string) {
  const stats = await db.review.aggregate({
    where: { bookId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { rating: true }
  });
  await db.book.update({
    where: { id: bookId },
    data: { ratingAverage: stats._avg.rating, ratingsCount: stats._count.rating }
  });
}

export async function moderateAdminReview(reviewId: string, formData: FormData) {
  const admin = await requireAdmin("/admin/reviews");
  const status = String(formData.get("status")) as ReviewStatus;
  if (!allowedStatuses.has(status)) throw new Error("Invalid review status");

  const review = await db.review.update({
    where: { id: reviewId },
    data: { status },
    include: { book: { select: { id: true, slug: true, title: true } }, user: { select: { id: true } } }
  });

  await refreshBookRating(review.book.id);

  const notification = notificationForStatus(status, review.book.title);
  if (notification) {
    await createNotification({
      userId: review.user.id,
      type: `REVIEW_${status}`,
      title: notification.title,
      body: notification.body,
      href: `/books/${review.book.slug}`
    });
  }

  await logAdminAction({ adminUserId: admin.id, action: "REVIEW_STATUS_CHANGED", targetType: "REVIEW", targetId: reviewId, metadata: { status } });
  revalidatePath("/admin/reviews");
  revalidatePath(`/books/${review.book.slug}`);
}

export async function deleteAdminReview(reviewId: string) {
  const admin = await requireAdmin("/admin/reviews");
  const review = await db.review.findUnique({
    where: { id: reviewId },
    include: { book: { select: { id: true, slug: true, title: true } }, user: { select: { id: true } } }
  });
  if (!review) return;

  await db.review.delete({ where: { id: reviewId } });
  await refreshBookRating(review.book.id);
  await createNotification({
    userId: review.user.id,
    type: "REVIEW_DELETED",
    title: "Отзыв удалён",
    body: `Модератор удалил ваш отзыв на «${review.book.title}».`,
    href: `/books/${review.book.slug}`
  });
  await logAdminAction({ adminUserId: admin.id, action: "REVIEW_DELETED", targetType: "REVIEW", targetId: reviewId });
  revalidatePath("/admin/reviews");
  revalidatePath(`/books/${review.book.slug}`);
}
