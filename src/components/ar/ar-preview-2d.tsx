import Image from "next/image";
import React from "react";

import { DEFAULT_AR_COVER } from "@/lib/ar/types";
import { resolveBookImageSrc } from "@/lib/books/image-source";

import type { ARBookPayload } from "@/lib/ar/types";

export function ARPreview2D({ book }: { book: ARBookPayload }) {
  const accentColor = book.dominantColor ?? "#0F172A";
  const imageSrc = resolveBookImageSrc(book.coverImage, DEFAULT_AR_COVER);

  return (
    <div
      data-testid="ar-preview-2d"
      className="grid gap-8 overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/85 p-8 shadow-[0_24px_80px_rgba(2,6,23,0.35)] md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]"
      style={{
        backgroundImage: `radial-gradient(circle at top left, ${accentColor}66, transparent 34%), linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.96))`
      }}
    >
      <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-900/70">
        <Image
          src={imageSrc}
          alt={book.title}
          width={720}
          height={1080}
          className="h-full w-full object-cover"
          priority
        />
      </div>
      <div className="flex flex-col justify-between gap-6">
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
            Fallback Preview
          </p>
          <p className="max-w-2xl text-base leading-7 text-slate-300">
            AR is not available on this device yet, so this page keeps the cover,
            metadata, and reading summary visible in a stable 2D layout.
          </p>
        </div>
        <dl className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900/65 p-4">
            <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">Authors</dt>
            <dd className="mt-2 text-base text-slate-100">{book.authors.join(", ")}</dd>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/65 p-4">
            <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">Mode</dt>
            <dd className="mt-2 text-base text-slate-100">2D fallback</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
