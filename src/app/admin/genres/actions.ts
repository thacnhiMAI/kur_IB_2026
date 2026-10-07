"use server";

import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { db } from "@/lib/db";

export async function deleteAdminGenre(genreId: string) {
  await requireAdmin();
  await db.genre.delete({ where: { id: genreId } });
  await revalidatePublicCatalogPaths({ includeAllBookPages: true });
  redirect("/admin/genres");
}
