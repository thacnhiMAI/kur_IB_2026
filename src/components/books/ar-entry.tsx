"use client";

import React from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

import { getARAbsoluteUrl, getARRoutePath } from "@/lib/ar/urls";

type AREntryProps = {
  slug: string;
  title: string;
};

export function AREntry({ slug, title }: AREntryProps) {
  const routePath = getARRoutePath(slug);
  const absoluteUrl = getARAbsoluteUrl(slug);

  return (
    <div className="rounded-[28px] border border-cyan-400/20 bg-slate-950/80 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.3)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <h2 className="text-xl font-semibold text-white">AR Preview</h2>
          <p className="text-sm leading-6 text-slate-400">
            Откройте книгу в AR на телефоне или используйте fallback preview на текущем
            устройстве.
          </p>
          <Link
            href={routePath}
            className="inline-flex rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300"
          >
            Открыть AR
          </Link>
        </div>

        <div className="w-fit rounded-[24px] border border-white/10 bg-white p-4" data-testid="book-ar-qr">
          <QRCodeSVG value={absoluteUrl} title={`AR QR for ${title}`} size={112} />
        </div>
      </div>
    </div>
  );
}
