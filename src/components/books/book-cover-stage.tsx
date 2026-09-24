import React from "react";
import Image from "next/image";

type BookCoverStageProps = {
  title: string;
  subtitle?: string | null;
  coverImage?: string | null;
  blurDataUrl?: string | null;
  dominantColor?: string | null;
  isFeatured?: boolean;
};

const FALLBACK_COVER = "/covers/fallback-book.jpg";
const DEFAULT_STAGE_COLOR = "#1E293B";

export function BookCoverStage({
  title,
  subtitle,
  coverImage,
  blurDataUrl,
  dominantColor,
  isFeatured = false
}: BookCoverStageProps) {
  const stageColor = dominantColor ?? DEFAULT_STAGE_COLOR;

  return (
    <div
      data-testid="book-cover-stage"
      className="relative isolate overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/90 p-6 shadow-[0_40px_120px_rgba(15,23,42,0.45)]"
      style={{
        background: `linear-gradient(160deg, ${stageColor} 0%, rgba(15,23,42,0.92) 58%, rgba(2,6,23,0.96) 100%)`
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.16),transparent_28%)]" />
      <div className="absolute -right-10 top-12 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -left-8 bottom-10 h-24 w-24 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative mx-auto flex max-w-[320px] justify-center pt-4">
        <div className="absolute inset-y-10 left-4 w-7 rounded-l-[28px] bg-slate-950/65 shadow-[inset_-8px_0_18px_rgba(255,255,255,0.08)]" />
        <div className="relative ml-6 w-full rounded-[28px] border border-white/15 bg-slate-950/50 p-3 shadow-[0_28px_90px_rgba(2,6,23,0.55)]">
          <div className="absolute inset-y-4 left-1 w-2 rounded-full bg-white/10 blur-[1px]" />
          <Image
            src={coverImage ?? FALLBACK_COVER}
            alt={title}
            width={720}
            height={1080}
            priority
            sizes="(max-width: 1280px) 100vw, 380px"
            placeholder={blurDataUrl ? "blur" : "empty"}
            blurDataURL={blurDataUrl ?? undefined}
            className="mx-auto h-[420px] w-full rounded-[22px] object-cover shadow-2xl shadow-slate-950/60"
          />
        </div>
      </div>

      <div className="relative mt-6 rounded-[24px] border border-white/10 bg-slate-950/40 p-5 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Premium shelf</p>
            <p className="mt-2 text-lg font-semibold text-white">{title}</p>
            {subtitle ? <p className="mt-1 text-sm text-slate-300">{subtitle}</p> : null}
          </div>
          {isFeatured ? (
            <span className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100">
              Featured
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
