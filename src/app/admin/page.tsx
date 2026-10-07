import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin("/admin");
  const [users, books, pendingReviews, bannedUsers] = await Promise.all([
    db.user.count(),
    db.book.count(),
    db.review.count({ where: { status: "PENDING" } }),
    db.user.count({ where: { OR: [{ bannedPermanently: true }, { bannedUntil: { gt: new Date() } }] } })
  ]);

  const cards = [
    { label: "Пользователи", value: users, href: "/admin/users" },
    { label: "Книги", value: books, href: "/admin/books" },
    { label: "Отзывы на проверке", value: pendingReviews, href: "/admin/reviews" },
    { label: "Заблокированные", value: bannedUsers, href: "/admin/users" }
  ];

  return (
    <section className="space-y-7">
      <div><p className="concept-kicker">ADMIN CONTROL CENTER</p><h1 className="mt-3 text-4xl text-[var(--text-primary)]">Панель управления</h1><p className="mt-3 max-w-3xl leading-7 text-[var(--text-secondary)]">Управление каталогом, пользователями, доступом и модерацией контента.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <Link key={card.label} href={card.href} className="editorial-surface rounded-[24px] p-6 transition hover:-translate-y-1"><p className="text-sm text-[var(--text-muted)]">{card.label}</p><p className="mt-4 text-4xl font-semibold text-[var(--text-primary)]">{card.value}</p></Link>)}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {[['Книги','/admin/books'],['Авторы','/admin/authors'],['Жанры','/admin/genres'],['Пользователи','/admin/users'],['Отзывы','/admin/reviews'],['Импорт','/admin/import'],['Audit','/admin/audit']].map(([label, href]) => <Link key={href} href={href} className="editorial-button-secondary rounded-2xl px-5 py-4 text-center text-sm font-semibold">{label}</Link>)}
      </div>
    </section>
  );
}
