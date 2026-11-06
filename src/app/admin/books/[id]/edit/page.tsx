import React from "react";
import { notFound, redirect } from "next/navigation";

import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { BookForm } from "@/components/admin/book-form";
import { applyUploadedCoverToBook } from "@/lib/admin/cover-upload";
import { parseBookPayload } from "@/lib/admin/book-input";
import { requireAdmin } from "@/lib/auth";
import { canonicalBookSlug } from "@/lib/books/slug";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { db } from "@/lib/db";
import { schedulePublicationPushes } from "@/lib/pwa/push";
import { bookContentInputSchema } from "@/lib/reading/content-input";
import { syncBookContentSources } from "@/lib/reading/content-management";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function EditAdminBookPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin(`/admin/books/${id}/edit`);

  const [authors, genres] = await Promise.all([
    db.author.findMany({ orderBy: { name: "asc" } }),
    db.genre.findMany({ orderBy: { name: "asc" } })
  ]);

  const book = await db.book.findUnique({
    where: { id },
    include: {
      authors: true,
      genres: true,
      contents: {
        orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }]
      }
    }
  });

  if (!book) {
    notFound();
  }

  const currentSlug = book.slug;
  const currentCoverImage = book.coverImage;

  async function updateBook(formData: FormData) {
    "use server";

    const admin = await requireAdmin();

    const coverFileEntry = formData.get("coverFile");
    const coverFile =
      coverFileEntry instanceof File && coverFileEntry.size > 0 ? coverFileEntry : null;

    const parsed = parseBookPayload({
      title: String(formData.get("title") ?? ""),
      subtitle: String(formData.get("subtitle") ?? ""),
      originalTitle: String(formData.get("originalTitle") ?? ""),
      slug: canonicalBookSlug(String(formData.get("slug") ?? ""), String(formData.get("title") ?? "")),
      description: String(formData.get("description") ?? ""),
      coverImage: coverFile ? "" : String(formData.get("coverImage") ?? ""),
      year: Number(formData.get("year")),
      isbn: String(formData.get("isbn") ?? "") || undefined,
      isbn10: String(formData.get("isbn10") ?? "") || undefined,
      isbn13: String(formData.get("isbn13") ?? "") || undefined,
      publisher: String(formData.get("publisher") ?? "") || undefined,
      edition: String(formData.get("edition") ?? "") || undefined,
      language: String(formData.get("language") ?? ""),
      pages: Number(formData.get("pages")),
      isFeatured: formData.get("isFeatured"),
      isPublished: formData.get("isPublished"),
      authorIds: formData.getAll("authorIds"),
      genreIds: formData.getAll("genreIds")
    });

    const parsedContent = bookContentInputSchema.parse({
      externalUrl: String(formData.get("externalUrl") ?? ""),
      makePdfPrimary: formData.get("makePdfPrimary") === "on"
    });

    const pdfFileEntry = formData.get("pdfFile");
    const pdfFile = pdfFileEntry instanceof File && pdfFileEntry.size > 0 ? pdfFileEntry : null;

    const updatedBook = await db.book.update({
      where: { id },
      data: {
        title: parsed.title,
        subtitle: parsed.subtitle || null,
        originalTitle: parsed.originalTitle || null,
        slug: parsed.slug,
        description: parsed.description,
        coverImage: coverFile ? currentCoverImage : parsed.coverImage || null,
        year: parsed.year,
        isbn: parsed.isbn || null,
        isbn10: parsed.isbn10 || null,
        isbn13: parsed.isbn13 || null,
        publisher: parsed.publisher || null,
        edition: parsed.edition || null,
        language: parsed.language,
        pages: parsed.pages,
        isFeatured: parsed.isFeatured,
        isPublished: parsed.isPublished,
        authors: {
          deleteMany: {},
          create: parsed.authorIds.map((authorId) => ({ authorId }))
        },
        genres: {
          deleteMany: {},
          create: parsed.genreIds.map((genreId) => ({ genreId }))
        }
      }
    });

    if (coverFile) {
      await applyUploadedCoverToBook({
        bookId: updatedBook.id,
        slug: updatedBook.slug,
        file: coverFile
      });
    }

    await syncBookContentSources({
      bookId: updatedBook.id,
      slug: updatedBook.slug,
      userId: admin.id,
      pdfFile,
      externalUrl: parsedContent.externalUrl ?? "",
      makePdfPrimary: parsedContent.makePdfPrimary
    });

    await revalidatePublicCatalogPaths({
      bookSlugs: [currentSlug, updatedBook.slug]
    });

    if (updatedBook.isPublished) schedulePublicationPushes();
    redirect("/admin/books");
  }

  return (
    <section data-testid="admin-shell" className="space-y-8">
      <AdminSectionNav current="books" />

      <div className="space-y-3 border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent-text)]">Admin</p>
        <div>
          <h1 className="text-4xl font-semibold text-white">Редактирование книги</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Обновите описание, metadata и параметры карточки книги.
          </p>
        </div>
      </div>

      <BookForm
        action={updateBook}
        submitLabel="Сохранить изменения"
        options={{
          authors: authors.map((author) => ({
            id: author.id,
            name: author.name,
            slug: author.slug
          })),
          genres: genres.map((genre) => ({
            id: genre.id,
            name: genre.name,
            slug: genre.slug
          }))
        }}
        initialValues={{
          title: book.title,
          subtitle: book.subtitle,
          originalTitle: book.originalTitle,
          slug: book.slug,
          description: book.description,
          coverImage: book.coverImage,
          year: book.year,
          isbn: book.isbn,
          isbn10: book.isbn10,
          isbn13: book.isbn13,
          publisher: book.publisher,
          edition: book.edition,
          language: book.language,
          pages: book.pages,
          isFeatured: book.isFeatured,
          isPublished: book.isPublished,
          authorIds: book.authors.map((author) => author.authorId),
          genreIds: book.genres.map((genre) => genre.genreId),
          externalUrl:
            book.contents.find((content) => content.sourceType === "EXTERNAL_LINK")?.externalUrl ??
            null,
          contentSummary: book.contents.map((content) => {
            if (content.sourceType === "PDF") {
              return `${content.isPrimary ? "Основной PDF" : "PDF"}: ${content.fileName ?? "uploaded file"}`;
            }

            return `${content.isPrimary ? "Основная внешняя ссылка" : "Внешняя ссылка"}: ${content.externalUrl ?? "не указана"}`;
          })
        }}
      />
    </section>
  );
}
