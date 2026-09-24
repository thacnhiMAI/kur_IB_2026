import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminAuthorsPage() {
  await requireAdmin();

  const authors = await db.author.findMany({
    include: {
      _count: {
        select: { books: true }
      }
    },
    orderBy: [{ name: "asc" }]
  });

  return (
    <section className="space-y-6">
      <AdminSectionNav current="authors" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý tác giả</h1>
          <p className="mt-2 text-slate-300">Thêm và chỉnh sửa tác giả dùng trong catalog và recommendations.</p>
        </div>
        <Link href="/admin/authors/new" className="rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950">
          Thêm tác giả
        </Link>
      </div>

      <div className="space-y-4">
        {authors.map((author) => (
          <article key={author.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">{author.name}</h2>
                <p className="text-sm text-slate-400">{author.slug}</p>
                <p className="text-sm text-slate-300">Số sách liên kết: {author._count.books}</p>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link
                  href={`/admin/authors/${author.id}/edit`}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100"
                >
                  Chỉnh sửa
                </Link>
                <form
                  action={async () => {
                    "use server";

                    await requireAdmin();
                    await db.author.delete({
                      where: { id: author.id }
                    });
                    await revalidatePublicCatalogPaths({
                      includeAllBookPages: true
                    });
                    redirect("/admin/authors");
                  }}
                >
                  <DeleteSubmitButton
                    idleLabel="Xóa"
                    pendingLabel="Đang xóa..."
                    confirmMessage={`Xóa tác giả "${author.name}"?`}
                  />
                </form>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
