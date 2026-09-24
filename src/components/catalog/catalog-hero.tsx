import React from "react";
import Link from "next/link";
import type { ReactNode } from "react";

type CatalogHeroProps = {
  totalBooks: number;
  featuredCount: number;
  children: ReactNode;
};

export function CatalogHero({
  totalBooks,
  featuredCount,
  children
}: CatalogHeroProps) {
  return (
    <section className="catalog-hero rounded-[32px] p-6 sm:p-8 xl:p-10">
      <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:items-start">
        <div className="space-y-6">
          <span className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
            Premium catalog
          </span>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Каталог книг
            </h1>
            <p className="max-w-2xl text-2xl font-semibold text-slate-100 sm:text-3xl">
              Подберите следующую книгу
            </p>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Исследуйте подборки с акцентом на реальные метаданные, обложки из
              локального кэша и витринную подачу для ключевых книг каталога.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="#featured-shelf"
              className="inline-flex items-center rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              К главной полке
            </Link>
            <Link
              href="#catalog-results"
              className="inline-flex items-center rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/40 hover:text-cyan-100"
            >
              Все результаты
            </Link>
          </div>

          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="catalog-glass-panel rounded-2xl p-4">
              <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">
                В каталоге
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-slate-50">{totalBooks}</dd>
            </div>
            <div className="catalog-glass-panel rounded-2xl p-4">
              <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Featured
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-slate-50">
                {featuredCount}
              </dd>
            </div>
            <div className="catalog-glass-panel rounded-2xl p-4">
              <dt className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Формат
              </dt>
              <dd className="mt-2 text-lg font-semibold text-slate-50">
                Shelf + grid
              </dd>
            </div>
          </dl>
        </div>

        <div className="catalog-glass-panel rounded-[28px] p-4 sm:p-5">
          <div className="mb-4 space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Умный поиск
            </p>
            <p className="text-sm leading-6 text-slate-300">
              Фильтруйте по названию, автору, жанру и году, затем переходите к
              карточке книги без переключения контекста.
            </p>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}
