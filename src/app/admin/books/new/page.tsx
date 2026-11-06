import React from "react";
import { redirect } from "next/navigation";

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

export default async function NewAdminBookPage() {
  await requireAdmin("/admin/books/new");

  const [authors, genres] = await Promise.all([
    db.author.findMany({ orderBy: { name: "asc" } }),
    db.genre.findMany({ orderBy: { name: "asc" } })
  ]);

  async function createBook(formData: FormData) {
    "use server";

    const currentAdmin = await requireAdmin();

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

    const book = await db.book.create({
      data: {
        title: parsed.title,
        subtitle: parsed.subtitle || null,
        originalTitle: parsed.originalTitle || null,
        slug: parsed.slug,
        description: parsed.description,
        coverImage: parsed.coverImage || null,
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
          create: parsed.authorIds.map((authorId) => ({ authorId }))
        },
        genres: {
          create: parsed.genreIds.map((genreId) => ({ genreId }))
        }
      }
    });

    if (coverFile) {
      await applyUploadedCoverToBook({
        bookId: book.id,
        slug: book.slug,
        file: coverFile
      });
    }

    await syncBookContentSources({
      bookId: book.id,
      slug: book.slug,
      userId: currentAdmin.id,
      pdfFile,
      externalUrl: parsedContent.externalUrl ?? "",
      makePdfPrimary: parsedContent.makePdfPrimary
    });

    await revalidatePublicCatalogPaths({
      bookSlugs: [book.slug]
    });

    if (book.isPublished) schedulePublicationPushes();
    redirect("/admin/books");
  }

  return (
    <section data-testid="admin-shell" className="space-y-8">
      <AdminSectionNav current="books" />

      <div className="space-y-3 border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent-text)]">Admin</p>
        <div>
          <h1 className="text-4xl font-semibold text-white">Новая книга</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Создайте карточку для каталога и последующих рекомендаций.
          </p>
        </div>
      </div>

      <BookForm
        action={createBook}
        submitLabel="Создать книгу"
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
          externalUrl: null,
          contentSummary: []
        }}
      />
    </section>
  );
}
