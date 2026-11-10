"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, QrCode } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

import { getARRoutePath } from "@/lib/ar/urls";

const QRCodeSVG = dynamic(() => import("qrcode.react").then((module) => module.QRCodeSVG), {
  ssr: false
});

type AREntryProps = {
  slug: string;
  title: string;
};

type ShareResult = {
  url: string;
  source: "configured" | "request" | "lan" | "fallback";
  secure: boolean;
  warning: string | null;
};

export function AREntry({ slug, title }: AREntryProps) {
  const routePath = useMemo(() => getARRoutePath(slug), [slug]);
  const [share, setShare] = useState<ShareResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadShareUrl() {
      try {
        const response = await fetch(`/api/ar/share-url?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store"
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = (await response.json()) as ShareResult;
        if (active) setShare(result);
      } catch {
        if (!active) return;
        setShare({
          url: `${window.location.origin}${routePath}`,
          source: "fallback",
          secure: window.location.protocol === "https:",
          warning: "Не удалось получить share URL. Проверьте AR_PUBLIC_BASE_URL и доступ к локальной сети."
        });
      }
    }

    void loadShareUrl();
    return () => {
      active = false;
    };
  }, [routePath, slug]);

  async function copyShareUrl() {
    if (!share?.url) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="concept-panel-soft rounded-[26px] p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="flex items-center gap-2 text-[var(--accent-text)]">
            <QrCode size={19} />
            <p className="concept-kicker">3D / AR</p>
          </div>
          <h2 className="font-display text-2xl text-[var(--text-primary)]">Открыть книгу в 3D / AR</h2>
          <p className="text-sm leading-7 text-[var(--text-secondary)]">
            На компьютере откроется 3D Reader. QR ниже создаётся с адресом, доступным телефону; при локальной разработке он автоматически пытается использовать LAN IP вместо localhost.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href={routePath} className="concept-button-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold">
              Открыть 3D / AR <ExternalLink size={16} />
            </Link>
            {share?.url ? (
              <button type="button" onClick={copyShareUrl} className="concept-button-secondary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium">
                <Copy size={16} /> {copied ? "Скопировано" : "Копировать ссылку"}
              </button>
            ) : null}
          </div>

          {share?.warning ? (
            <p className="max-w-2xl rounded-xl border border-amber-400/25 bg-amber-400/8 px-4 py-3 text-xs leading-6 text-amber-200">
              {share.warning}
            </p>
          ) : null}

          {share?.url ? (
            <p className="break-all text-xs text-[var(--text-muted)]">{share.url}</p>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">Подготавливаем QR-ссылку…</p>
          )}
        </div>

        <div className="w-fit rounded-[22px] border border-[var(--surface-border)] bg-white p-4 shadow-[0_18px_50px_rgba(0,0,0,.24)]" data-testid="book-ar-qr">
          {share?.url ? (
            <QRCodeSVG value={share.url} title={`AR QR for ${title}`} size={132} level="M" includeMargin />
          ) : (
            <div className="h-[132px] w-[132px] animate-pulse rounded-lg bg-slate-200" />
          )}
        </div>
      </div>
    </section>
  );
}
