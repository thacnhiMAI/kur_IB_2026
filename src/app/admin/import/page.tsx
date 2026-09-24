import React from "react";

import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { ImportBooksForm } from "@/components/admin/import-books-form";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  await requireAdmin();
  const [totalBooks, importedBooks, featuredBooks, publishedBooks, cachedCovers, latestImport] =
    await Promise.all([
      db.book.count(),
      db.book.count({
        where: {
          OR: [{ sourcePrimary: { not: null } }, { sourceRecords: { some: {} } }]
        }
      }),
      db.book.count({ where: { isFeatured: true } }),
      db.book.count({ where: { isPublished: true } }),
      db.book.count({ where: { coverAssets: { some: { status: "ready" } } } }),
      db.bookSourceRecord.findFirst({
        orderBy: { lastImportedAt: "desc" },
        include: {
          book: {
            select: {
              title: true
            }
          }
        }
      })
    ]);

  return (
    <section className="space-y-6">
      <AdminSectionNav current="books" />

      <div>
        <h1 className="text-3xl font-bold">Импорт каталога</h1>
        <p className="mt-2 text-slate-300">
          Запустите повторный импорт из внешних провайдеров, чтобы обновить каталог и метаданные.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Книги в каталоге</p>
          <p className="mt-2 text-3xl font-semibold">{totalBooks}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Импортированные книги</p>
          <p className="mt-2 text-3xl font-semibold">{importedBooks}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Кэшированные обложки</p>
          <p className="mt-2 text-3xl font-semibold">{cachedCovers}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Опубликовано</p>
          <p className="mt-2 text-3xl font-semibold">{publishedBooks}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">На витрине</p>
          <p className="mt-2 text-3xl font-semibold">{featuredBooks}</p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <ImportBooksForm />

        <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Последний импорт</h2>
          {latestImport ? (
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p>
                Провайдер: <span className="text-slate-100">{latestImport.provider}</span>
              </p>
              <p>
                Книга: <span className="text-slate-100">{latestImport.book.title}</span>
              </p>
              <p>
                Время: <span className="text-slate-100">{latestImport.lastImportedAt.toISOString()}</span>
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">
              История импортов появится после первого успешного запуска.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
