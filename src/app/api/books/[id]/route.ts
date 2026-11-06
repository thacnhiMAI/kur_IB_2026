import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { parseBookPayload } from "@/lib/admin/book-input";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/permissions";
import { schedulePublicationPushes } from "@/lib/pwa/push";

export const maxDuration = 60;

async function ensureAdmin() {
  const session = await auth();

  if (!session?.user || !canAccessAdmin(session.user)) {
    return false;
  }

  return true;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = await ensureAdmin();

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = parseBookPayload({
    ...body,
    authorIds: body.authorIds,
    genreIds: body.genreIds
  });
  const existingBook = await db.book.findUnique({
    where: { id },
    select: { slug: true, isPublished: true }
  });

  const book = await db.book.update({
    where: { id },
    data: {
      title: parsed.title,
      slug: parsed.slug,
      description: parsed.description,
      coverImage: parsed.coverImage || null,
      year: parsed.year,
      isbn: parsed.isbn || null,
      language: parsed.language,
      pages: parsed.pages,
      ...(body.isPublished !== undefined && { isPublished: parsed.isPublished }),
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
    bookSlugs: [existingBook?.slug, book.slug]
  });

  if (book.isPublished && !existingBook?.isPublished) schedulePublicationPushes();
  return NextResponse.json(book);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = await ensureAdmin();

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existingBook = await db.book.findUnique({
    where: { id },
    select: { slug: true }
  });

  await db.book.delete({
    where: { id }
  });

  await revalidatePublicCatalogPaths({
    bookSlugs: [existingBook?.slug]
  });

  return NextResponse.json({ success: true });
}
