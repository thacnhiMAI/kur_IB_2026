import React from "react";
import { notFound, redirect } from "next/navigation";

import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { BookForm } from "@/components/admin/book-form";
import { parseBookPayload } from "@/lib/admin/book-input";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditAdminBookPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [authors, genres] = await Promise.all([
    db.author.findMany({ orderBy: { name: "asc" } }),
    db.genre.findMany({ orderBy: { name: "asc" } })
  ]);

  const book = await db.book.findUnique({
    where: { id },
    include: {
      authors: true,
      genres: true
    }
  });

  if (!book) {
    notFound();
  }

  const currentSlug = book.slug;

  async function updateBook(formData: FormData) {
    "use server";

    await requireAdmin();

    const parsed = parseBookPayload({
      title: String(formData.get("title") ?? ""),
      subtitle: String(formData.get("subtitle") ?? ""),
      originalTitle: String(formData.get("originalTitle") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      description: String(formData.get("description") ?? ""),
      coverImage: String(formData.get("coverImage") ?? ""),
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

    const updatedBook = await db.book.update({
      where: { id },
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
          deleteMany: {},
          create: parsed.authorIds.map((authorId) => ({ authorId }))
        },
        genres: {
          deleteMany: {},
          create: parsed.genreIds.map((genreId) => ({ genreId }))
        }
      }
    });

    await revalidatePublicCatalogPaths({
      bookSlugs: [currentSlug, updatedBook.slug]
    });

    redirect("/admin/books");
  }

  return (
    <section className="space-y-6">
      <AdminSectionNav current="books" />

      <div>
        <h1 className="text-3xl font-bold">Редактирование книги</h1>
        <p className="mt-2 text-slate-300">Обновите описание, metadata и параметры карточки книги.</p>
      </div>
      <BookForm
        action={updateBook}
        submitLabel="Сохранить изменения"
        options={{
          authors: authors.map((author) => ({ id: author.id, name: author.name })),
          genres: genres.map((genre) => ({ id: genre.id, name: genre.name }))
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
          genreIds: book.genres.map((genre) => genre.genreId)
        }}
      />
    </section>
  );
}
