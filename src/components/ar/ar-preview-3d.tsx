"use client";

import React from "react";

import { ARReaderLite } from "@/components/ar/ar-reader-lite";

import type { ARRendererVariant } from "@/lib/ar/capabilities";
import type { ARBookPayload } from "@/lib/ar/types";

export function ARPreview3D({
  book,
  renderer,
  pdfUrl,
  isAuthenticated
}: {
  book: ARBookPayload;
  renderer: ARRendererVariant;
  pdfUrl?: string | null;
  isAuthenticated: boolean;
}) {
  return (
    <div data-testid="ar-preview-3d" className="concept-panel overflow-hidden rounded-[32px]">
      <div className="flex flex-col gap-2 border-b border-[var(--surface-border)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="concept-kicker">{pdfUrl && isAuthenticated ? "3D PDF Reader" : "3D Preview"}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Реальные страницы PDF используются только когда у книги есть внутренний файл и пользователь вошёл в аккаунт.
          </p>
        </div>
        <p className="concept-pill w-fit rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em]">
          {renderer === "book-solid" ? "solid CSS 3D" : "CSS 3D card"}
        </p>
      </div>
      <div className="bg-[radial-gradient(circle_at_top,rgb(var(--accent-rgb)/0.14),transparent_42%)] px-5 py-9 sm:px-8 sm:py-12">
        <ARReaderLite book={book} renderer={renderer} pdfUrl={pdfUrl} isAuthenticated={isAuthenticated} />
      </div>
    </div>
  );
}
