import React from "react";
import Link from "next/link";

import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { AdminBooksList } from "@/components/admin/admin-books-list";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminBooksPage() {
  await requireAdmin("/admin/books");

  const books = await db.book.findMany({
    include: {
      authors: {
        include: {
          author: true
        }
      },
      genres: {
        include: {
          genre: true
        }
      },
      coverAssets: {
        orderBy: { lastFetchedAt: "desc" },
        take: 1
      },
      sourceRecords: {
        orderBy: { lastImportedAt: "desc" },
        take: 1
      }
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }]
  });

  const booksForClient = books.map((book) => ({
    id: book.id,
    title: book.title,
    slug: book.slug,
    description: book.description,
    year: book.year,
    language: book.language,
    isFeatured: book.isFeatured,
    isPublished: book.isPublished,
    authors: book.authors.map(({ author }) => author.name),
    genres: book.genres.map(({ genre }) => genre.name),
    sourceLabel: book.sourceRecords[0]?.provider ?? book.sourcePrimary ?? "Ручной ввод",
    coverLabel:
      book.coverAssets[0]?.status === "ready"
        ? "Кэширована"
        : book.coverAssets[0]?.status
          ? `Статус: ${book.coverAssets[0].status}`
          : book.coverImage
            ? book.coverImage.startsWith("/covers/")
              ? "Локальная"
              : "Внешний URL"
            : "Отсутствует"
  }));

  return (
    <section data-testid="admin-shell" className="space-y-8">
      <AdminSectionNav current="books" />

      <div className="flex flex-col gap-5 border-b border-[var(--surface-border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent-text)]">Admin</p>
          <div>
            <h1 className="text-4xl tracking-[-0.035em] text-[var(--text-primary)]">Управление книгами</h1>
            <p className="mt-2 text-[var(--text-secondary)]">
              Создание, редактирование и контроль карточек каталога.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/import"
            className="editorial-button-secondary rounded-full px-5 py-3 font-medium text-[var(--text-primary)]"
          >
            Импорт каталога
          </Link>
          <Link
            href="/admin/books/new"
            className="editorial-button-primary rounded-full px-5 py-3 font-medium text-white"
          >
            Добавить книгу
          </Link>
        </div>
      </div>

      <AdminBooksList books={booksForClient} />
    </section>
  );
}
