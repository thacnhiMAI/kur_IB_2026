import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminBooksPage() {
  await requireAdmin();

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

  return (
    <section className="space-y-6">
      <AdminSectionNav current="books" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Управление книгами</h1>
          <p className="mt-2 text-slate-300">Создание, редактирование и контроль карточек каталога.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/import"
            className="rounded-lg border border-slate-700 px-4 py-3 font-medium text-slate-100"
          >
            Импорт каталога
          </Link>
          <Link href="/admin/books/new" className="rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950">
            Добавить книгу
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {books.map((book) => (
          <article key={book.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">{book.title}</h2>
                <p className="text-sm text-slate-400">{book.slug}</p>
                <p className="text-slate-300">{book.description}</p>
                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-slate-700 px-3 py-1">Год: {book.year}</span>
                  <span className="rounded-full border border-slate-700 px-3 py-1">Язык: {book.language}</span>
                  {book.isFeatured ? (
                    <span className="rounded-full border border-cyan-500/50 bg-cyan-500/10 px-3 py-1 text-cyan-200">
                      Витрина
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full border px-3 py-1 ${
                      book.isPublished
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    }`}
                  >
                    {book.isPublished ? "Опубликовано" : "Черновик"}
                  </span>
                </div>
                <div className="space-y-2 pt-1">
                  <p className="text-sm text-slate-400">
                    Авторы:{" "}
                    {book.authors.length > 0 ? book.authors.map(({ author }) => author.name).join(", ") : "Не выбраны"}
                  </p>
                  <p className="text-sm text-slate-400">
                    Жанры:{" "}
                    {book.genres.length > 0 ? book.genres.map(({ genre }) => genre.name).join(", ") : "Не выбраны"}
                  </p>
                  <p className="text-sm text-slate-400">
                    Импорт:{" "}
                    {book.sourceRecords[0]?.provider ??
                      book.sourcePrimary ??
                      "Ручной ввод"}
                  </p>
                  <p className="text-sm text-slate-400">
                    Обложка:{" "}
                    {book.coverAssets[0]?.status === "ready"
                      ? "Кэширована"
                      : book.coverAssets[0]?.status
                        ? `Статус: ${book.coverAssets[0].status}`
                        : book.coverImage
                          ? "Внешний URL"
                          : "Отсутствует"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link
                  href={`/admin/books/${book.id}/edit`}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100"
                >
                  Редактировать
                </Link>
                <form
                  action={async () => {
                    "use server";

                    await requireAdmin();
                    await db.book.delete({
                      where: { id: book.id }
                    });
                    await revalidatePublicCatalogPaths({
                      bookSlugs: [book.slug]
                    });
                    redirect("/admin/books");
                  }}
                >
                  <DeleteSubmitButton
                    idleLabel="Удалить"
                    pendingLabel="Удаление..."
                    confirmMessage={`Удалить книгу "${book.title}"?`}
                  />
                </form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
