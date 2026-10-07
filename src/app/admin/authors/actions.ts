"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { db } from "@/lib/db";

export async function deleteAdminAuthor(authorId: string) {
  await requireAdmin();
  await db.author.delete({ where: { id: authorId } });
  await revalidatePublicCatalogPaths({ includeAllBookPages: true });
  redirect("/admin/authors");
}
