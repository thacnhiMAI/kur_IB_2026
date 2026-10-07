import React from "react";
import Link from "next/link";

import { AdminAuthorsList } from "@/components/admin/admin-authors-list";
import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminAuthorsPage() {
  await requireAdmin("/admin/authors");

  const authors = await db.author.findMany({
    include: {
      _count: {
        select: { books: true }
      }
    },
    orderBy: [{ name: "asc" }]
  });

  const authorsForClient = authors.map((author) => ({
    id: author.id,
    name: author.name,
    slug: author.slug,
    booksCount: author._count.books
  }));

  return (
    <section className="space-y-6">
      <AdminSectionNav current="authors" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl tracking-[-0.035em] text-[var(--text-primary)]">Управление авторами</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Добавляйте и редактируйте авторов для каталога и recommendations.
          </p>
        </div>
        <Link href="/admin/authors/new" className="rounded-lg bg-[var(--accent-strong)] px-4 py-3 font-medium text-white">
          Добавить автора
        </Link>
      </div>

      <AdminAuthorsList authors={authorsForClient} />
    </section>
  );
}
