import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ExternalReaderShell } from "@/components/reader/external-reader-shell";
import { PdfReaderShell } from "@/components/reader/pdf-reader-shell";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolvePrimaryBookContent } from "@/lib/reading/content-source";

export default async function ReadBookPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser(`/read/books/${slug}`);

  const book = await db.book.findFirst({
    where: {
      slug,
      isPublished: true
    },
    include: {
      contents: {
        orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }]
      }
    }
  });

  if (!book) notFound();

  const content = resolvePrimaryBookContent(book.contents);
  const progress = await db.readingProgress.findUnique({
    where: {
      userId_bookId: {
        userId: user.id,
        bookId: book.id
      }
    }
  });

  if (!content) {
    return (
      <section className="concept-panel rounded-[34px] p-8 sm:p-10">
        <p className="concept-eyebrow">Reading studio</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          <Link href={`/books/${book.slug}`} className="transition hover:text-[var(--accent-text)]">
            {book.title}
          </Link>
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-[var(--text-secondary)]">
          Для этой книги ещё не настроен источник чтения. Администратор может добавить внутренний PDF или внешнюю ссылку позже.
        </p>
      </section>
    );
  }

  if (content.sourceType === "PDF" && content.storagePath) {
    return (
      <PdfReaderShell
        title={book.title}
        slug={book.slug}
        language={book.language}
        fileUrl={`/api/reading/content/${content.id}`}
        bookId={book.id}
        contentId={content.id}
        cacheScope={JSON.stringify([user.id, content.id, content.updatedAt?.toISOString()])}
        initialPage={progress?.lastPage || 1}
        isAuthenticated
      />
    );
  }

  return (
    <ExternalReaderShell
      title={book.title}
      slug={book.slug}
      href={content.externalUrl ?? "#"}
    />
  );
}
