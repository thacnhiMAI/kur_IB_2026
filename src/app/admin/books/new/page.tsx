import React from "react";
import { redirect } from "next/navigation";

import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { BookForm } from "@/components/admin/book-form";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { db } from "@/lib/db";
import { parseBookPayload } from "@/lib/admin/book-input";

export const dynamic = "force-dynamic";

export default async function NewAdminBookPage() {
  await requireAdmin();
  const [authors, genres] = await Promise.all([
    db.author.findMany({ orderBy: { name: "asc" } }),
    db.genre.findMany({ orderBy: { name: "asc" } })
  ]);

  async function createBook(formData: FormData) {
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

    await revalidatePublicCatalogPaths({
      bookSlugs: [book.slug]
    });

    redirect("/admin/books");
  }

  return (
    <section className="space-y-6">
      <AdminSectionNav current="books" />

      <div>
        <h1 className="text-3xl font-bold">Новая книга</h1>
        <p className="mt-2 text-slate-300">Создайте карточку для каталога и последующих рекомендаций.</p>
      </div>
      <BookForm
        action={createBook}
        submitLabel="Создать книгу"
        options={{
          authors: authors.map((author) => ({ id: author.id, name: author.name })),
          genres: genres.map((genre) => ({ id: genre.id, name: genre.name }))
        }}
      />
    </section>
  );
}
