"use client";

import React from "react";

import { BookSolidRenderer } from "@/components/ar/book-solid-renderer";
import { FloatingCardRenderer } from "@/components/ar/floating-card-renderer";
import { DEFAULT_AR_COVER, DEFAULT_AR_COLOR } from "@/lib/ar/types";

import type { ARRendererVariant } from "@/lib/ar/capabilities";
import type { ARBookPayload } from "@/lib/ar/types";

export function ARPreview3D({
  book,
  renderer
}: {
  book: ARBookPayload;
  renderer: ARRendererVariant;
}) {
  return (
    <div
      data-testid="ar-preview-3d"
      className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/85 shadow-[0_24px_80px_rgba(2,6,23,0.35)]"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-cyan-300">
          3D Preview
        </p>
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
          {renderer === "book-solid" ? "solid-renderer" : "floating-card"}
        </p>
      </div>
      <div className="flex min-h-[520px] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] px-8 py-12">
        {renderer === "book-solid" ? (
          <BookSolidRenderer
            color={book.dominantColor ?? DEFAULT_AR_COLOR}
            title={book.title}
          />
        ) : (
          <FloatingCardRenderer coverImage={book.coverImage ?? DEFAULT_AR_COVER} />
        )}
      </div>
    </div>
  );
}
