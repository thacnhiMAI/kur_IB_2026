import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { getCatalogPageData } from "@/lib/catalog/service";
import { canAccessAdmin } from "@/lib/permissions";
import { db } from "@/lib/db";
import { parseBookPayload } from "@/lib/admin/book-input";
import { schedulePublicationPushes } from "@/lib/pwa/push";

export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const data = await getCatalogPageData({
    q: searchParams.get("q") ?? undefined,
    genre: searchParams.get("genre") ?? undefined,
    author: searchParams.get("author") ?? undefined,
    year: searchParams.get("year") ?? undefined
  });

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || !canAccessAdmin(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = parseBookPayload({
    ...body,
    authorIds: body.authorIds,
    genreIds: body.genreIds
  });

  const book = await db.book.create({
    data: {
      title: parsed.title,
      slug: parsed.slug,
      description: parsed.description,
      coverImage: parsed.coverImage || null,
      year: parsed.year,
      isbn: parsed.isbn || null,
      language: parsed.language,
      pages: parsed.pages,
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

  if (book.isPublished) schedulePublicationPushes();
  return NextResponse.json(book, { status: 201 });
}
