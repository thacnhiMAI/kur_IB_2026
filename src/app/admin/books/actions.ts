"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { db } from "@/lib/db";

export async function deleteAdminBook(bookId: string, slug: string) {
  await requireAdmin();
  await db.book.delete({ where: { id: bookId } });
  await revalidatePublicCatalogPaths({ bookSlugs: [slug] });
  redirect("/admin/books");
}
