import React from "react";
import Link from "next/link";
import Image from "next/image";

type BookCardProps = {
  id?: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description: string;
  authors: string[];
  genres: string[];
  year: number;
  coverImage?: string | null;
  blurDataUrl?: string | null;
  dominantColor?: string;
  variant?: "default" | "featured";
};

const FALLBACK_COVER = "/covers/fallback-book.jpg";
const DEFAULT_BOOK_COLOR = "#0F172A";

export function BookCard({
  slug,
  title,
  subtitle,
  description,
  authors,
  genres,
  year,
  coverImage,
  blurDataUrl,
  dominantColor = DEFAULT_BOOK_COLOR,
  variant = "default"
}: BookCardProps) {
  const isFeatured = variant === "featured";

  return (
    <article
      data-testid="book-card-3d"
      className={[
        "book-card-surface group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 p-5 shadow-[0_30px_80px_rgba(2,6,23,0.45)] transition-transform duration-300",
        "motion-safe:hover:-translate-y-2 motion-safe:hover:rotate-[0.35deg]",
        isFeatured ? "min-h-[34rem]" : "min-h-[32rem]"
      ].join(" ")}
      style={{
        backgroundImage: `radial-gradient(circle at top left, ${dominantColor}55, transparent 42%), linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(2,6,23,0.96) 100%)`
      }}
    >
      <div className="book-spine-effect" />

      <div className="relative flex h-full flex-col">
        <div className="book-cover-frame mb-5 overflow-hidden rounded-[24px] border border-white/10 bg-slate-900/70 p-2">
          <Image
            src={coverImage ?? FALLBACK_COVER}
            alt={title}
            width={720}
            height={1080}
            sizes={
              isFeatured
                ? "(max-width: 768px) 100vw, 420px"
                : "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 360px"
            }
            placeholder={blurDataUrl ? "blur" : "empty"}
            blurDataURL={blurDataUrl ?? undefined}
            className={[
              "w-full rounded-[18px] object-cover shadow-2xl shadow-slate-950/50",
              isFeatured ? "h-80" : "h-72"
            ].join(" ")}
          />
        </div>

        <p className="text-sm text-slate-400">{authors.join(", ")} · {year}</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-50">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        ) : null}
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-300">
          {description}
        </p>
        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-cyan-300">
          {genres.length > 0 ? genres.join(", ") : "Каталог"}
        </p>
        <Link
          href={`/books/${slug}`}
          className="mt-auto inline-flex pt-5 text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
        >
        Открыть карточку
        </Link>
      </div>
    </article>
  );
}
