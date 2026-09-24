import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";

export const PUBLIC_CATALOG_REVALIDATE_SECONDS = 300;

export async function getPublicBookSlugs() {
  const books = await db.book.findMany({
    select: { slug: true },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }]
  });

  return books.map((book) => book.slug);
}

export async function revalidatePublicCatalogPaths(options?: {
  bookSlugs?: Array<string | null | undefined>;
  includeAllBookPages?: boolean;
}) {
  revalidatePath("/catalog");

  const slugs = new Set(
    (options?.bookSlugs ?? []).filter((slug): slug is string => Boolean(slug))
  );

  if (options?.includeAllBookPages) {
    const allSlugs = await getPublicBookSlugs();

    for (const slug of allSlugs) {
      slugs.add(slug);
    }
  }

  for (const slug of slugs) {
    revalidatePath(`/books/${slug}`);
  }
}
