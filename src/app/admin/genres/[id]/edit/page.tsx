import React from "react";
import { notFound, redirect } from "next/navigation";

import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { TaxonomyForm } from "@/components/admin/taxonomy-form";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { db } from "@/lib/db";
import { taxonomySchema } from "@/lib/validators/taxonomy";

export const dynamic = "force-dynamic";

export default async function EditAdminGenrePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin(`/admin/genres/${id}/edit`);

  const genre = await db.genre.findUnique({
    where: { id }
  });

  if (!genre) {
    notFound();
  }

  async function updateGenre(formData: FormData) {
    "use server";

    await requireAdmin();

    const parsed = taxonomySchema.parse({
      name: String(formData.get("name") ?? ""),
      slug: String(formData.get("slug") ?? "")
    });

    await db.genre.update({
      where: { id },
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
        <h1 className="text-3xl font-bold">Редактирование жанра</h1>
        <p className="mt-2 text-slate-300">Обновите жанр, чтобы синхронизировать фильтры и группировку книг.</p>
      </div>
      <TaxonomyForm
        action={updateGenre}
        submitLabel="Сохранить изменения"
        initialValues={{ name: genre.name, slug: genre.slug }}
      />
    </section>
  );
}
