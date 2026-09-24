import React from "react";
import Image from "next/image";
import Link from "next/link";

const FALLBACK_COVER = "/covers/fallback-book.jpg";

type RecommendationCardProps = {
  title: string;
  slug: string;
  reason: string;
  badge?: string;
  coverImage?: string | null;
  blurDataUrl?: string | null;
  author: string;
  score?: number | null;
};

export function RecommendationCard({
  title,
  slug,
  reason,
  badge,
  coverImage,
  blurDataUrl,
  author,
  score
}: RecommendationCardProps) {
  return (
    <article
      data-testid="recommendation-card"
      className="flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900 p-5 shadow-[0_24px_70px_rgba(2,6,23,0.38)]"
    >
      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/70 p-2">
        <Image
          src={coverImage ?? FALLBACK_COVER}
          alt={title}
          width={512}
          height={768}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 320px"
          placeholder={blurDataUrl ? "blur" : "empty"}
          blurDataURL={blurDataUrl ?? undefined}
          className="h-72 w-full rounded-[18px] object-cover"
        />
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{author}</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-50">{title}</h2>
        </div>
        {score != null ? (
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
            {score.toFixed(1)}
          </span>
        ) : null}
      </div>

      {badge ? (
        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-cyan-300">{badge}</p>
      ) : null}
      <p className="mt-3 text-sm leading-7 text-slate-300">{reason}</p>
      <Link
        href={`/books/${slug}`}
        className="mt-auto inline-flex pt-5 text-sm font-medium text-cyan-300 hover:text-cyan-200"
      >
        Перейти к книге
      </Link>
    </article>
  );
}
