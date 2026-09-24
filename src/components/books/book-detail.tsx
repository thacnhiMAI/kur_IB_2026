import React from "react";

import { AREntry } from "@/components/books/ar-entry";
import { BookCoverStage } from "@/components/books/book-cover-stage";

type BookDetailProps = {
  bookId: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description: string;
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
  favoriteAction: (formData: FormData) => Promise<void>;
  interestAction: (formData: FormData) => Promise<void>;
  finishedAction: (formData: FormData) => Promise<void>;
  initialReview?: {
    rating: number;
    content: string;
  } | null;
  reviewAction: (formData: FormData) => Promise<void>;
  reviews: Array<{
    id: string;
    rating: number;
    content: string;
    authorName: string;
  }>;
};

export function BookDetail({
  bookId,
  slug,
  title,
  subtitle,
  description,
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
  favoriteAction,
  interestAction,
  finishedAction,
  initialReview,
  reviewAction,
  reviews
}: BookDetailProps) {
  return (
    <section className="space-y-8">
      <div className="grid gap-8 xl:grid-cols-[380px_minmax(0,1fr)]">
        <BookCoverStage
          title={title}
          subtitle={subtitle}
          coverImage={coverImage}
          blurDataUrl={blurDataUrl}
          dominantColor={dominantColor}
          isFeatured={isFeatured}
        />

        <div className="space-y-6 rounded-[28px] border border-white/10 bg-slate-950/80 p-8 shadow-[0_24px_80px_rgba(2,6,23,0.35)]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm uppercase tracking-[0.18em] text-cyan-300">
                {authors.join(", ")} · {year}
              </p>
              {isFeatured ? (
                <span className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100">
                  Featured selection
                </span>
              ) : null}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">{title}</h1>
              {subtitle ? <p className="mt-2 text-lg text-slate-300">{subtitle}</p> : null}
            </div>
            <p className="max-w-3xl text-base leading-7 text-slate-300">{description}</p>
            <p className="text-sm text-slate-400">
              Жанры: {genres.length > 0 ? genres.join(", ") : "Каталог"}
            </p>
          </div>

          <div className="grid gap-4 rounded-[24px] border border-white/10 bg-slate-900/70 p-5 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Рейтинг читателей</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {ratingAverage ? `${ratingAverage.toFixed(1)} / 5` : "Пока нет оценок"}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {ratingsCount ? `${ratingsCount} оценок в каталоге` : "Станьте первым, кто оставит отзыв"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Формат издания</p>
              <p className="mt-2 text-2xl font-semibold text-white">{pages} стр.</p>
              <p className="mt-1 text-sm text-slate-400">
                {edition ?? "Основное издание"} · {language.toUpperCase()}
              </p>
            </div>
          </div>

          <dl className="grid gap-4 text-sm text-slate-300 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
              <dt className="text-slate-500">Издатель:</dt>
              <dd className="mt-2 text-base text-slate-100">{publisher ?? "Не указан"}</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
              <dt className="text-slate-500">ISBN-13:</dt>
              <dd className="mt-2 text-base text-slate-100">{isbn13 ?? "Нет данных"}</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
              <dt className="text-slate-500">Язык:</dt>
              <dd className="mt-2 text-base text-slate-100">{language.toUpperCase()}</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
              <dt className="text-slate-500">Издание:</dt>
              <dd className="mt-2 text-base text-slate-100">{edition ?? "Не указано"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <AREntry slug={slug} title={title} />

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Действия с книгой</h2>
        <p className="mt-2 text-sm text-slate-400">
          Добавьте книгу в избранное или сохраните сигналы для персональных рекомендаций.
          Для сохранения потребуется вход в аккаунт.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={favoriteAction}>
            <input type="hidden" name="bookId" value={bookId} />
            <input type="hidden" name="slug" value={slug} />
            <button className="rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950">
              В избранное
            </button>
          </form>
          <form action={interestAction}>
            <input type="hidden" name="bookId" value={bookId} />
            <input type="hidden" name="slug" value={slug} />
            <button className="rounded-lg border border-slate-700 px-4 py-3 font-medium text-slate-100">
              Отметить интерес
            </button>
          </form>
          <form action={finishedAction}>
            <input type="hidden" name="bookId" value={bookId} />
            <input type="hidden" name="slug" value={slug} />
            <button className="rounded-lg border border-emerald-500/40 px-4 py-3 font-medium text-emerald-200">
              Отметить прочитанной
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Оставить отзыв</h2>
        <p className="mt-2 text-sm text-slate-400">
          Оцените книгу и сохраните своё впечатление. Отзыв можно обновлять.
        </p>
        <form action={reviewAction} className="mt-4 space-y-4">
          <input type="hidden" name="bookId" value={bookId} />
          <input type="hidden" name="slug" value={slug} />
          <div>
            <label className="mb-2 block text-sm text-slate-300" htmlFor="rating">
              Оценка
            </label>
            <input
              id="rating"
              name="rating"
              type="number"
              min="1"
              max="5"
              defaultValue={initialReview?.rating ?? 5}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-300" htmlFor="content">
              Текст отзыва
            </label>
            <textarea
              id="content"
              name="content"
              rows={5}
              defaultValue={initialReview?.content ?? ""}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
            />
          </div>
          <button className="rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950">
            Сохранить отзыв
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Отзывы</h2>
        {reviews.length > 0 ? (
          <div className="mt-4 space-y-4">
            {reviews.map((review) => (
              <article key={review.id} className="border-b border-slate-800 pb-4 last:border-b-0">
                <p className="font-medium">{review.authorName}</p>
                <p className="mt-1 text-sm text-slate-400">Оценка: {review.rating}/5</p>
                <p className="mt-2 text-slate-300">{review.content}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-slate-400">Пока нет отзывов для этой книги.</p>
        )}
      </div>
    </section>
  );
}
