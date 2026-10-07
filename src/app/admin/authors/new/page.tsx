import React from "react";
import { redirect } from "next/navigation";

import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { TaxonomyForm } from "@/components/admin/taxonomy-form";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { db } from "@/lib/db";
import { taxonomySchema } from "@/lib/validators/taxonomy";

export const dynamic = "force-dynamic";

export default async function NewAdminAuthorPage() {
  await requireAdmin("/admin/authors/new");

  async function createAuthor(formData: FormData) {
    "use server";

    await requireAdmin();

    const parsed = taxonomySchema.parse({
      name: String(formData.get("name") ?? ""),
      slug: String(formData.get("slug") ?? "")
    });

    await db.author.create({
      data: parsed
    });

    await revalidatePublicCatalogPaths({
      includeAllBookPages: true
    });

    redirect("/admin/authors");
  }

  return (
    <section className="space-y-6">
      <AdminSectionNav current="authors" />
      <div>
        <h1 className="text-3xl font-bold">Новый автор</h1>
        <p className="mt-2 text-slate-300">Создайте автора, чтобы связывать его с книгами в системе.</p>
      </div>
      <TaxonomyForm action={createAuthor} submitLabel="Создать автора" />
    </section>
  );
}
