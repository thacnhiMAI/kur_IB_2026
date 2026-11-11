"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bookmark, Loader2 } from "lucide-react";
import Link from "next/link";

import { setRecommendationFavorite } from "@/app/recommendations/actions";
import { BookCoverImage } from "@/components/books/book-cover-image";

const FALLBACK_COVER = "/covers/fallback-book.jpg";

type RecommendationCardProps = {
  bookId: string;
  isFavorite: boolean;
  description: string;
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
  bookId,
  isFavorite,
  description,
  title,
  slug,
  reason,
  badge,
  coverImage,
  blurDataUrl,
  author,
  score
}: RecommendationCardProps) {
  const [favorite, setFavorite] = useState(isFavorite);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const busy = useRef(false);
  useEffect(() => { setFavorite(isFavorite); }, [isFavorite]);

  async function saveFavorite() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setFeedback("");
    try {
      const result = await setRecommendationFavorite(bookId, !favorite);
      if (result.ok) {
        setFavorite(result.active);
        setFeedback(result.active ? "Добавлено в избранное." : "Удалено из избранного.");
      } else setFeedback(result.message);
    } catch {
      setFeedback("Не удалось сохранить книгу. Попробуйте ещё раз.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }


  return (
    <article data-testid="recommendation-card" className="recommendation-card-reference group relative flex min-w-0 flex-1 flex-col p-4">
      <Link href={`/books/${slug}`} className="relative block overflow-hidden rounded-[12px] bg-[var(--surface-3)]">
        <BookCoverImage
          src={coverImage} fallback={FALLBACK_COVER}
          alt={title}
          width={420}
          height={600}
          sizes="(max-width: 768px) 48vw, (max-width: 1280px) 28vw, 230px"
          placeholder={blurDataUrl ? "blur" : "empty"}
          blurDataURL={blurDataUrl ?? undefined}
          className="aspect-[3/4] w-full object-cover transition duration-300 group-hover:scale-[1.025]"
        />
        <div className="invisible absolute inset-0 flex flex-col bg-[var(--surface-1)] p-4 pt-16 opacity-0 transition duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
          <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Описание книги</h3>
          <p className="min-h-0 overflow-y-auto whitespace-pre-line text-sm leading-6 text-[var(--text-secondary)]">{description.trim() || "Описание пока не добавлено."}</p>
        </div>
      </Link>

      <button type="button" onClick={saveFavorite} disabled={pending} aria-pressed={favorite}
        aria-label={favorite ? "Удалить из избранного" : "Добавить в избранное"}
        title={favorite ? "Удалить из избранного" : "Добавить в избранное"}
        className="absolute right-6 top-6 z-10 grid h-9 w-9 place-items-center rounded-xl border border-[var(--surface-border)] bg-[var(--surface-1)] text-[var(--accent-text)] shadow-sm transition hover:bg-[var(--surface-3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-text)] disabled:cursor-wait disabled:opacity-60">
        {pending ? <Loader2 size={17} className="animate-spin" /> : <Bookmark size={17} fill={favorite ? "currentColor" : "none"} />}
      </button>

      <div className="mt-4 min-w-0">
        <Link href={`/books/${slug}`}>
          <h2 className="font-display line-clamp-2 text-[1.12rem] font-semibold leading-tight text-[var(--text-primary)] transition group-hover:text-[var(--accent-text)]">{title}</h2>
        </Link>
        <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">{author}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {badge ? <span className="concept-pill rounded-full px-2.5 py-1 text-[11px]">{badge}</span> : null}
        {score != null ? <span className="concept-pill rounded-full px-2.5 py-1 text-[11px]">Совпадение: {score.toFixed(1)} / 100</span> : null}
      </div>

      {feedback && <p role="status" className="mt-3 text-xs text-[var(--text-secondary)]">{feedback}</p>}
      <p className="mt-3 line-clamp-3 text-xs leading-5 text-[var(--text-muted)]">{reason}</p>
    </article>
  );
}
