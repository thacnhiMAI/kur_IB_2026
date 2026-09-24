import React from "react";
import { notFound } from "next/navigation";

import { ARClientShell } from "@/components/ar/ar-client-shell";
import { toARBookPayload } from "@/lib/books/presenters";
import { getBookDetailPageData } from "@/lib/catalog/service";

export const revalidate = 300;

export default async function ARBookPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = await getBookDetailPageData(slug);

  if (!book) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <ARClientShell book={toARBookPayload(book)} />
      </div>
    </main>
  );
}
