import React from "react";
import Link from "next/link";

import { AdminGenresList } from "@/components/admin/admin-genres-list";
import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminGenresPage() {
  await requireAdmin("/admin/genres");

  const genres = await db.genre.findMany({
    include: {
      _count: {
        select: { books: true }
      }
    },
    orderBy: [{ name: "asc" }]
  });

  const genresForClient = genres.map((genre) => ({
    id: genre.id,
    name: genre.name,
    slug: genre.slug,
    booksCount: genre._count.books
  }));

  return (
    <section className="space-y-6">
      <AdminSectionNav current="genres" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl tracking-[-0.035em] text-[var(--text-primary)]">Управление жанрами</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Редактируйте жанры для фильтров, каталога и recommendation signals.
          </p>
        </div>
        <Link href="/admin/genres/new" className="rounded-lg bg-[var(--accent-strong)] px-4 py-3 font-medium text-white">
          Добавить жанр
        </Link>
      </div>

      <AdminGenresList genres={genresForClient} />
    </section>
  );
}
