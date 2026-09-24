import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminGenresPage() {
  await requireAdmin();

  const genres = await db.genre.findMany({
    include: {
      _count: {
        select: { books: true }
      }
    },
    orderBy: [{ name: "asc" }]
  });

  return (
    <section className="space-y-6">
      <AdminSectionNav current="genres" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý thể loại</h1>
          <p className="mt-2 text-slate-300">Quản lý genre dùng cho filter, catalog và recommendation signals.</p>
        </div>
        <Link href="/admin/genres/new" className="rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950">
          Thêm thể loại
        </Link>
      </div>

      <div className="space-y-4">
        {genres.map((genre) => (
          <article key={genre.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">{genre.name}</h2>
                <p className="text-sm text-slate-400">{genre.slug}</p>
                <p className="text-sm text-slate-300">Số sách liên kết: {genre._count.books}</p>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link
                  href={`/admin/genres/${genre.id}/edit`}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100"
                >
                  Chỉnh sửa
                </Link>
                <form
                  action={async () => {
                    "use server";

                    await requireAdmin();
                    await db.genre.delete({
                      where: { id: genre.id }
                    });
                    await revalidatePublicCatalogPaths({
                      includeAllBookPages: true
                    });
                    redirect("/admin/genres");
                  }}
                >
                  <DeleteSubmitButton
                    idleLabel="Xóa"
                    pendingLabel="Đang xóa..."
                    confirmMessage={`Xóa thể loại "${genre.name}"?`}
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
