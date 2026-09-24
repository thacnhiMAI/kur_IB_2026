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
  await requireAdmin();

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
        <h1 className="text-3xl font-bold">Thêm tác giả</h1>
        <p className="mt-2 text-slate-300">Tạo tác giả mới để gắn vào sách trong hệ thống.</p>
      </div>
      <TaxonomyForm action={createAuthor} submitLabel="Tạo tác giả" />
    </section>
  );
}
