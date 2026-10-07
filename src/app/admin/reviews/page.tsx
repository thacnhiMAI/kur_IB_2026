import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { AdminReviewsList } from "@/components/admin/admin-reviews-list";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requireAdmin("/admin/reviews");
  const reviews = await db.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      book: { select: { title: true, slug: true } }
    }
  });

  return (
    <section className="space-y-7">
      <AdminSectionNav current="reviews" />
      <div><p className="concept-kicker">ADMIN · MODERATION</p><h1 className="mt-3 text-4xl text-[var(--text-primary)]">Отзывы</h1><p className="mt-3 text-[var(--text-secondary)]">Новые и изменённые отзывы отправляются на модерацию и видны читателям только после публикации.</p></div>
      <AdminReviewsList reviews={reviews.map((review) => ({ id: review.id, rating: review.rating, content: review.content, status: review.status, createdAt: review.createdAt.toISOString(), userName: review.user.name ?? "Без имени", userEmail: review.user.email, bookTitle: review.book.title, bookSlug: review.book.slug }))} />
    </section>
  );
}
