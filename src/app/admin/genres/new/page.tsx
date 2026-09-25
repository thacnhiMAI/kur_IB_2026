import React from "react";
import { redirect } from "next/navigation";

import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { TaxonomyForm } from "@/components/admin/taxonomy-form";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { db } from "@/lib/db";
import { taxonomySchema } from "@/lib/validators/taxonomy";

export const dynamic = "force-dynamic";

export default async function NewAdminGenrePage() {
  await requireAdmin();

  async function createGenre(formData: FormData) {
    "use server";

    await requireAdmin();

    const parsed = taxonomySchema.parse({
      name: String(formData.get("name") ?? ""),
      slug: String(formData.get("slug") ?? "")
    });

    await db.genre.create({
      data: parsed
    });

    await revalidatePublicCatalogPaths({
      includeAllBookPages: true
    });

    redirect("/admin/genres");
  }

  return (
    <section className="space-y-6">
      <AdminSectionNav current="genres" />
      <div>
        <h1 className="text-3xl font-bold">Новый жанр</h1>
        <p className="mt-2 text-slate-300">Создайте жанр, чтобы он появился в фильтрах и группировках книг.</p>
      </div>
      <TaxonomyForm action={createGenre} submitLabel="Создать жанр" />
    </section>
  );
}
