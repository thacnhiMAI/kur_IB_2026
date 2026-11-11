import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { ARClientShell } from "@/components/ar/ar-client-shell";
import { toARBookPayload } from "@/lib/books/presenters";
import { getBookDetailPageData } from "@/lib/catalog/service";

export const revalidate = 300;

export default async function ARBookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [book, session] = await Promise.all([getBookDetailPageData(slug), auth()]);

  if (!book) notFound();

  const isAuthenticated = Boolean(session?.user?.id);
  const pdfUrl =
    isAuthenticated && book.readingMode === "internal" && book.primaryContentId
      ? `/api/reading/content/${book.primaryContentId}`
      : null;

  return (
    <main className="min-h-screen px-0 py-2 text-[var(--text-primary)]">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="concept-panel rounded-[30px] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="concept-kicker">3D / AR studio</p>
              <h1 className="text-3xl font-semibold text-[var(--text-primary)]">{book.title}</h1>
              <p className="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
                Откройте обложку и описание в AR. На совместимом телефоне AR-очки не нужны.
              </p>
              {book.readingMode === "internal" ? (
                <p className="max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                  Нажмите «Читать PDF в AR» ниже, чтобы листать страницы в пространстве. Для чтения на экране выберите «Читать PDF».
                </p>
              ) : null}
              {book.readingMode === "internal" && !isAuthenticated ? (
                <p className="text-sm text-[var(--text-secondary)]">Войдите в аккаунт, чтобы открыть PDF в AR.</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              {book.readHref && book.readLabel ? (
                <Link href={book.readHref} className="concept-button-primary inline-flex rounded-full px-5 py-3 text-sm font-semibold">
                  {book.readingMode === "internal" ? "Читать PDF" : book.readLabel}
                </Link>
              ) : (
                <div className="rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-3 text-sm text-amber-200">
                  Внутренний PDF не добавлен
                </div>
              )}
              <Link href={`/books/${book.slug}`} className="concept-button-secondary inline-flex rounded-full px-5 py-3 text-sm font-medium">
                Вернуться к книге
              </Link>
            </div>
          </div>
        </section>

        <ARClientShell book={toARBookPayload(book)} pdfUrl={pdfUrl} isAuthenticated={isAuthenticated} />
      </div>
    </main>
  );
}
