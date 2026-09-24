import React from "react";
import { notFound, redirect } from "next/navigation";

import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { TaxonomyForm } from "@/components/admin/taxonomy-form";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { db } from "@/lib/db";
import { taxonomySchema } from "@/lib/validators/taxonomy";

export const dynamic = "force-dynamic";

export default async function EditAdminAuthorPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const author = await db.author.findUnique({
    where: { id }
  });

  if (!author) {
    notFound();
  }

  async function updateAuthor(formData: FormData) {
    "use server";

    await requireAdmin();

    const parsed = taxonomySchema.parse({
      name: String(formData.get("name") ?? ""),
      slug: String(formData.get("slug") ?? "")
    });

    await db.author.update({
      where: { id },
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
        <h1 className="text-3xl font-bold">Chỉnh sửa tác giả</h1>
        <p className="mt-2 text-slate-300">Cập nhật thông tin tác giả để đồng bộ catalog.</p>
      </div>
      <TaxonomyForm
        action={updateAuthor}
        submitLabel="Lưu thay đổi"
        initialValues={{ name: author.name, slug: author.slug }}
      />
    </section>
  );
}
