import React from "react";
import Link from "next/link";

import { BookCoverImage } from "@/components/books/book-cover-image";

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
  readingStatus?: "not-started" | "in-progress" | "completed";
};

const FALLBACK_COVER = "/covers/fallback-book.jpg";
const DEFAULT_BOOK_COLOR = "#0F172A";

function normalizeGenreTag(tag: string) {
  const trimmed = tag.trim();
  if (!trimmed || trimmed.includes("=") || trimmed.includes(":")) return null;
  return trimmed;
}

function formatGenreSummary(genres: string[]) {
  const cleaned = genres.map(normalizeGenreTag).filter((genre): genre is string => Boolean(genre));
  const unique = Array.from(new Map(cleaned.map((genre) => [genre.toLowerCase(), genre])).values());
  if (unique.length === 0) return "Каталог";
  const visible = unique.slice(0, 3).join(" · ");
  return unique.length > 3 ? `${visible}...` : visible;
}

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
  variant = "default",
  readingStatus = "not-started"
}: BookCardProps) {
  const isFeatured = variant === "featured";
  const genreSummary = formatGenreSummary(genres);
  const titleId = `book-card-title-${slug}`;

  return (
    <article
      data-testid="book-card-3d"
      className={[
        "editorial-book-card book-card-surface group relative flex h-full flex-col overflow-hidden rounded-[34px] border border-[var(--surface-border)] p-6 shadow-[0_36px_100px_var(--shadow-color)] transition-[transform,border-color,box-shadow] duration-300",
        "motion-safe:hover:-translate-y-2 motion-safe:hover:rotate-[0.35deg] hover:border-[var(--accent-border)]",
        isFeatured ? "min-h-[35rem]" : "min-h-[33rem]"
      ].join(" ")}
      style={{
        backgroundImage: `radial-gradient(circle at top left, color-mix(in srgb, ${dominantColor} 30%, rgb(var(--accent-rgb) / .18)), transparent 42%), linear-gradient(180deg, var(--surface-1) 0%, var(--surface-2) 100%)`
      }}
    >
      <div className="absolute right-5 top-5 z-10">
        <span
          data-testid="catalog-reading-dot"
          className={[
            "block h-3 w-3 rounded-full",
            readingStatus === "completed" ? "bg-emerald-300" : readingStatus === "in-progress" ? "bg-amber-300" : "hidden"
          ].join(" ")}
        />
      </div>

      <div className="relative flex h-full flex-col">
        <div className="book-cover-frame mb-6 overflow-hidden rounded-[28px] border border-[var(--surface-border)] bg-[var(--surface-3)] p-2.5 transition-colors group-hover:border-[var(--accent-border)]">
          <BookCoverImage
            src={coverImage} fallback={FALLBACK_COVER}
            alt={title}
            width={720}
            height={1080}
            sizes={isFeatured ? "(max-width: 768px) 100vw, 420px" : "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 360px"}
            placeholder={blurDataUrl ? "blur" : "empty"}
            blurDataURL={blurDataUrl ?? undefined}
            className={["w-full rounded-[18px] object-cover shadow-2xl", isFeatured ? "h-[22rem]" : "h-[19rem]"].join(" ")}
          />
        </div>

        <p className="text-sm text-[var(--text-secondary)]">{authors.join(", ")} · {year}</p>
        <h2 id={titleId} className="mt-3 text-[1.45rem] font-semibold leading-tight text-[var(--text-primary)]">
          <Link href={`/books/${slug}`} className="transition hover:text-[var(--accent-text)]">{title}</Link>
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p> : null}
        <p className="mt-4 line-clamp-3 text-sm leading-7 text-[var(--text-secondary)]">{description}</p>
        <p className="mt-5 line-clamp-1 text-xs uppercase tracking-[0.22em] text-[var(--accent-text)]">{genreSummary}</p>
      </div>
    </article>
  );
}
