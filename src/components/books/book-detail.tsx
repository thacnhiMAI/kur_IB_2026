import React from "react";
import Link from "next/link";

import { AREntry } from "@/components/books/ar-entry";
import { BookAdminControls } from "@/components/books/book-admin-controls";
import { BookCoverStage } from "@/components/books/book-cover-stage";
import { FavoriteHeartButton } from "@/components/books/favorite-heart-button";
import { ReadingProgressBar } from "@/components/books/reading-progress-bar";
import { StarRatingInput } from "@/components/reviews/star-rating-input";

type ReviewView = {
  id: string;
  rating: number;
  content: string;
  authorName: string;
  createdAt: string;
};

type PendingReviewView = {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
};

type BookDetailProps = {
  bookId: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description: string;
  externalReadingUrl?: string;
  year: number;
  coverImage?: string | null;
  blurDataUrl?: string | null;
  dominantColor?: string | null;
  authors: string[];
  genres: string[];
  publisher?: string | null;
  edition?: string | null;
  isbn13?: string | null;
  language: string;
  pages: number;
  ratingAverage?: number | null;
  ratingsCount?: number | null;
  isFeatured?: boolean;
  isFavorite: boolean;
  readingProgressPercent: number;
  readingMode: "internal" | "external" | "none";
  readHref: string | null;
  readLabel: "Читать" | "Открыть внешний источник" | null;
  signInHref: string;
  isAuthenticated: boolean;
  isAdmin: boolean;
  favoriteAction: (formData: FormData) => Promise<void>;
  reviewAction: (formData: FormData) => Promise<void>;
  reviews: ReviewView[];
  pendingReviews: PendingReviewView[];
};

function StaticStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400" aria-label={`${rating} из 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} aria-hidden="true">{index < rating ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

export function BookDetail({
  bookId,
  slug,
  title,
  subtitle,
  description,
  externalReadingUrl,
  year,
  coverImage,
  blurDataUrl,
  dominantColor,
  authors,
  genres,
  publisher,
  edition,
  isbn13,
  language,
  pages,
  ratingAverage,
  ratingsCount,
  isFeatured = false,
  isFavorite,
  readingProgressPercent,
  readingMode,
  readHref,
  readLabel,
  signInHref,
  isAuthenticated,
  isAdmin,
  favoriteAction,
  reviewAction,
  reviews,
  pendingReviews
}: BookDetailProps) {
  const hasInternalFile = readingMode === "internal";

  return (
    <section className="space-y-8">
      <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="relative">
          {isAdmin ? <BookAdminControls bookId={bookId} slug={slug} title={title} /> : null}
          <BookCoverStage
            title={title}
            subtitle={subtitle}
            coverImage={coverImage}
            blurDataUrl={blurDataUrl}
            dominantColor={dominantColor}
            isFeatured={isFeatured}
          />
        </div>

        <div className="concept-panel space-y-6 rounded-[34px] p-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="concept-kicker">{authors.join(", ")} · {year}</p>
              {isFeatured ? <span className="concept-pill rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]">Featured</span> : null}
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-5xl">{title}</h1>
              {subtitle ? <p className="mt-2 text-lg text-[var(--text-secondary)]">{subtitle}</p> : null}
            </div>
            <p className="max-w-3xl text-base leading-8 text-[var(--text-secondary)]">{description}</p>
            {externalReadingUrl && (
              <a href={externalReadingUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[var(--accent-text)] underline underline-offset-4">
                Открыть внешний источник
              </a>
            )}
            <p className="text-sm text-[var(--text-muted)]">Жанры: {genres.length > 0 ? genres.join(", ") : "Каталог"}</p>
          </div>

          <div className="grid gap-4 rounded-[28px] border border-[var(--surface-border)] bg-[var(--surface-3)] p-5 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Рейтинг читателей</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{ratingAverage ? `${ratingAverage.toFixed(1)} / 5` : "Пока нет оценок"}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{ratingsCount ? `${ratingsCount} оценок в каталоге` : "Станьте первым, кто оставит отзыв"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Формат издания</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{pages} стр.</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{edition ?? "Основное издание"} · {language.toUpperCase()}</p>
            </div>
          </div>

          <dl className="grid gap-4 text-sm md:grid-cols-2">
            {[["Издатель", publisher ?? "Не указан"], ["ISBN-13", isbn13 ?? "Нет данных"], ["Язык", language.toUpperCase()], ["Издание", edition ?? "Не указано"]].map(([label, value]) => (
              <div key={label} className="rounded-[22px] border border-[var(--surface-border)] bg-[var(--surface-3)] p-4">
                <dt className="text-[var(--text-muted)]">{label}:</dt>
                <dd className="mt-2 text-base text-[var(--text-primary)]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="concept-panel-soft rounded-[28px] p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {isAuthenticated ? (
              <form action={favoriteAction}>
                <input type="hidden" name="bookId" value={bookId} />
                <input type="hidden" name="slug" value={slug} />
                <FavoriteHeartButton active={isFavorite} />
              </form>
            ) : (
              <Link href={signInHref} prefetch={false} className="inline-flex">
                <span className="sr-only">Добавить в избранное</span>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--surface-border)] bg-[var(--surface-3)] text-[var(--text-secondary)]">♡</span>
              </Link>
            )}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Чтение книги</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {hasInternalFile ? "Прогресс сохраняется автоматически при чтении внутреннего PDF." : readingMode === "external" ? "Для этой книги доступен внешний источник чтения." : "Файл книги пока не добавлен."}
              </p>
            </div>
          </div>
          {readHref && readLabel ? <Link href={readHref} className="concept-button-primary rounded-full px-5 py-3 text-sm font-semibold">{readLabel}</Link> : <p className="text-sm text-[var(--text-muted)]">Нет доступного содержимого</p>}
        </div>
        {hasInternalFile ? <div className="mt-5"><ReadingProgressBar percent={readingProgressPercent} /></div> : null}
      </div>

      <AREntry slug={slug} title={title} />

      <div className="concept-panel-soft rounded-[28px] p-6">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Оставить отзыв</h2>
        {isAuthenticated ? (
          <>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Каждый новый отзыв отправляется на модерацию отдельно. Пока один отзыв ожидает одобрения, вы можете отправить следующий.</p>
            <form action={reviewAction} className="mt-5 space-y-4">
              <input type="hidden" name="bookId" value={bookId} />
              <input type="hidden" name="slug" value={slug} />
              <div>
                <p className="mb-2 text-sm text-[var(--text-secondary)]">Оценка</p>
                <StarRatingInput />
              </div>
              <div>
                <label className="mb-2 block text-sm text-[var(--text-secondary)]" htmlFor="content">Текст отзыва</label>
                <textarea id="content" name="content" rows={5} required minLength={10} maxLength={3000} className="concept-input rounded-xl px-4 py-3" placeholder="Поделитесь впечатлением о книге..." />
              </div>
              <button className="concept-button-primary rounded-xl px-4 py-3 text-sm font-semibold">Отправить на модерацию</button>
            </form>
          </>
        ) : (
          <div className="mt-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-3)] p-5">
            <p className="text-sm leading-6 text-[var(--text-secondary)]">Чтобы поставить оценку и написать отзыв, войдите в аккаунт.</p>
            <Link href={signInHref} prefetch={false} className="concept-button-primary mt-4 inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold">Войти, чтобы оценить</Link>
          </div>
        )}
      </div>

      <div className="concept-panel-soft rounded-[28px] p-6">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Отзывы</h2>

        {isAuthenticated && pendingReviews.length > 0 ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">Ваши отзывы на модерации</p>
            {pendingReviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-dashed border-[var(--surface-border-strong)] bg-[var(--surface-3)] p-4 opacity-65">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <StaticStars rating={review.rating} />
                  <span className="text-xs font-medium text-[var(--text-muted)]">… Ожидается одобрение</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap leading-7 text-[var(--text-secondary)]">{review.content}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{new Date(review.createdAt).toLocaleString("ru-RU")}</p>
              </article>
            ))}
          </div>
        ) : null}

        {reviews.length > 0 ? (
          <div className="mt-5 space-y-4">
            {reviews.map((review) => (
              <article key={review.id} className="border-b border-[var(--surface-border)] pb-4 last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-[var(--text-primary)]">{review.authorName}</p>
                  <StaticStars rating={review.rating} />
                </div>
                <p className="mt-2 text-[var(--text-secondary)]">{review.content}</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{new Date(review.createdAt).toLocaleString("ru-RU")}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[var(--text-secondary)]">Пока нет опубликованных отзывов для этой книги.</p>
        )}
      </div>
    </section>
  );
}
