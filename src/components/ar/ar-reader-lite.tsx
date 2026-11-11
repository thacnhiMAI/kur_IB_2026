"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useRef, useState } from "react";
import { pdfjs } from "react-pdf";

import { DEFAULT_AR_COVER } from "@/lib/ar/types";
import { BookCoverImage } from "@/components/books/book-cover-image";

import type { ARRendererVariant } from "@/lib/ar/capabilities";
import type { ARBookPayload } from "@/lib/ar/types";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type PdfLoadingTask = ReturnType<typeof pdfjs.getDocument>;
type PdfDocument = Awaited<PdfLoadingTask["promise"]>;

function getRendererLabel(renderer: ARRendererVariant) {
  return renderer === "book-solid" ? "CSS SOLID 3D" : "CSS 3D CARD";
}

async function renderPdfPage(pdf: PdfDocument, pageNumber: number) {
  const page = await pdf.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: 980 / base.width });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d");

  if (!context) throw new Error("Canvas недоступен в этом браузере.");

  await page.render({ canvas, canvasContext: context, viewport, background: "#ffffff" }).promise;
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  canvas.width = 0;
  canvas.height = 0;
  page.cleanup();
  return dataUrl;
}

export function ARReaderLite({
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
  const loadingTaskRef = useRef<PdfLoadingTask | null>(null);
  const pdfRef = useRef<PdfDocument | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [leftImage, setLeftImage] = useState<string | null>(null);
  const [rightImage, setRightImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasRealPdf = Boolean(pdfUrl && isAuthenticated);
  const rightPage = page + 1 <= totalPages ? page + 1 : null;

  useEffect(() => {
    if (!hasRealPdf || !pdfUrl) {
      pdfRef.current = null;
      setTotalPages(0);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    const task = pdfjs.getDocument({ url: pdfUrl });
    loadingTaskRef.current = task;

    void task.promise
      .then((pdf) => {
        if (cancelled) return;
        pdfRef.current = pdf;
        setTotalPages(pdf.numPages);
        setPage(1);
      })
      .catch(() => {
        if (!cancelled) setError("Не удалось загрузить PDF для 3D-просмотра.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      pdfRef.current = null;
      if (loadingTaskRef.current === task) loadingTaskRef.current = null;
      void task.destroy().catch(() => {});
    };
  }, [hasRealPdf, pdfUrl]);

  useEffect(() => {
    if (!isOpen || !pdfRef.current || totalPages === 0) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    void Promise.all([
      renderPdfPage(pdfRef.current, page),
      rightPage ? renderPdfPage(pdfRef.current, rightPage) : Promise.resolve(null)
    ])
      .then(([left, right]) => {
        if (cancelled) return;
        setLeftImage(left);
        setRightImage(right);
      })
      .catch(() => {
        if (!cancelled) setError("Не удалось отрисовать страницы PDF в 3D.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, page, rightPage, totalPages]);

  function openBook() {
    if (!hasRealPdf) return;
    setIsOpen(true);
  }

  function closeBook() {
    setIsOpen(false);
    setPage(1);
  }

  function previousSpread() {
    setPage((current) => Math.max(1, current - 2));
  }

  function nextSpread() {
    setPage((current) => Math.min(Math.max(1, totalPages - (totalPages % 2 === 0 ? 1 : 0)), current + 2));
  }

  return (
    <section data-testid="ar-reader-lite" className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="concept-kicker">{hasRealPdf ? "3D PDF Reader" : "3D Book Preview"}</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{book.title}</p>
        </div>
        <p className="concept-pill w-fit rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em]">
          {getRendererLabel(renderer)}
        </p>
      </header>

      {isOpen && hasRealPdf ? (
        <div className="mx-auto max-w-6xl py-4 [perspective:2200px]">
          <div
            data-testid="reader-lite-open-book"
            className="relative mx-auto grid w-full max-w-[1100px] grid-cols-[minmax(0,1fr)_26px_minmax(0,1fr)] items-stretch"
            style={{
              transform: "rotateX(8deg) rotateY(-3deg) translateZ(0)",
              transformStyle: "preserve-3d"
            }}
          >
            <div
              className="relative min-h-[420px] overflow-hidden rounded-l-[30px] rounded-r-[12px] bg-white shadow-[0_45px_100px_rgba(0,0,0,.38)]"
              style={{ transform: "rotateY(8deg) translateZ(14px)", transformOrigin: "right center" }}
            >
              {leftImage ? <img src={leftImage} alt={`Страница ${page}`} className="h-full w-full object-contain" draggable={false} /> : null}
              <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-slate-950/20 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-[repeating-linear-gradient(90deg,#f8fafc_0,#f8fafc_2px,#e2e8f0_3px,#f8fafc_5px)] opacity-80" />
            </div>

            <div className="relative z-20 rounded-full bg-[linear-gradient(90deg,#0f172a,#475569,#0f172a)] shadow-[inset_0_0_18px_rgba(255,255,255,.18),0_16px_30px_rgba(0,0,0,.4)]" style={{ transform: "translateZ(26px)" }} />

            <div
              className="relative min-h-[420px] overflow-hidden rounded-r-[30px] rounded-l-[12px] bg-white shadow-[0_45px_100px_rgba(0,0,0,.38)]"
              style={{ transform: "rotateY(-8deg) translateZ(14px)", transformOrigin: "left center" }}
            >
              {rightImage ? (
                <img src={rightImage} alt={`Страница ${rightPage}`} className="h-full w-full object-contain" draggable={false} />
              ) : (
                <div className="grid h-full min-h-[420px] place-items-center bg-slate-50 text-sm text-slate-400">Конец книги</div>
              )}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-slate-950/20 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-3 bg-[repeating-linear-gradient(90deg,#f8fafc_0,#f8fafc_2px,#e2e8f0_3px,#f8fafc_5px)] opacity-80" />
            </div>

            <div className="pointer-events-none absolute -bottom-12 left-[10%] right-[10%] h-20 rounded-[50%] bg-black/35 blur-3xl" />
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-4">
          <div className="relative h-[430px] w-[300px] [perspective:1800px]">
            <div
              data-testid="reader-lite-closed-book"
              className="absolute left-1/2 top-1/2 h-[380px] w-[260px] -translate-x-1/2 -translate-y-1/2"
              style={{ transform: "translate(-50%, -50%) rotateX(9deg) rotateY(-30deg)", transformStyle: "preserve-3d" }}
            >
              <div className="absolute inset-0 overflow-hidden rounded-[26px] border border-[var(--surface-border-strong)] bg-slate-900 shadow-[0_55px_100px_rgba(0,0,0,.5)]" style={{ transform: "translateZ(22px)" }}>
                <BookCoverImage src={book.coverImage} fallback={DEFAULT_AR_COVER} width={720} height={1080} unoptimized alt={book.title} className="h-full w-full object-cover" draggable={false} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-white/10" />
              </div>
              <div
                className="absolute inset-y-3 -right-[22px] w-11 rounded-r-[14px] border border-slate-300/40 bg-[repeating-linear-gradient(180deg,#fff_0,#fff_2px,#dce4ee_3px,#fff_5px)]"
                style={{ transform: "rotateY(90deg)", transformOrigin: "left center" }}
              />
              <div
                className="absolute inset-y-2 -left-[16px] w-8 rounded-l-[12px] border border-[var(--surface-border)]"
                style={{
                  transform: "rotateY(-90deg)",
                  transformOrigin: "right center",
                  background: `linear-gradient(180deg, ${book.dominantColor ?? "#0f172a"}, #020617)`
                }}
              />
              <div className="absolute inset-0 rounded-[26px] bg-slate-950" style={{ transform: "translateZ(-22px) rotateY(180deg)" }} />
            </div>
          </div>
        </div>
      )}

      {loading ? <p className="text-center text-sm text-[var(--text-muted)]">Загружаем страницы PDF…</p> : null}
      {error ? <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p> : null}

      {!hasRealPdf ? (
        <div className="concept-panel-soft rounded-[22px] p-5 text-sm leading-7 text-[var(--text-secondary)]">
          {!isAuthenticated
            ? "Чтобы читать реальный PDF в 3D, войдите в аккаунт. Обложка выше — только 3D preview."
            : "У этой книги нет внутреннего PDF. Поэтому доступен только 3D preview обложки, а не имитация чтения."}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {hasRealPdf ? (
          isOpen ? (
            <button type="button" onClick={closeBook} className="concept-button-secondary rounded-full px-4 py-2 text-sm font-medium">Закрыть книгу</button>
          ) : (
            <button type="button" onClick={openBook} className="concept-button-primary rounded-full px-4 py-2 text-sm font-semibold">Открыть PDF в 3D</button>
          )
        ) : null}

        <button type="button" onClick={previousSpread} disabled={!isOpen || page <= 1} className="concept-button-secondary rounded-full px-4 py-2 text-sm font-medium disabled:opacity-40">← Предыдущий разворот</button>
        <button type="button" onClick={nextSpread} disabled={!isOpen || rightPage === null || rightPage >= totalPages} className="concept-button-secondary rounded-full px-4 py-2 text-sm font-medium disabled:opacity-40">Следующий разворот →</button>
        {hasRealPdf && totalPages > 0 ? (
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Страницы {page}{rightPage ? `–${rightPage}` : ""} / {totalPages}</p>
        ) : null}
      </div>
    </section>
  );
}
