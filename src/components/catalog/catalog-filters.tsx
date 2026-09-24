import React from "react";

import type { CatalogPageData, CatalogSearchParams } from "@/lib/catalog/queries";

type CatalogFiltersProps = {
  filters: CatalogPageData["filters"];
  params: CatalogSearchParams;
};

export function CatalogFilters({ filters, params }: CatalogFiltersProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label htmlFor="catalog-filter-genre" className="sr-only">
          Жанр
        </label>
        <select
          id="catalog-filter-genre"
          name="genre"
          defaultValue={params.genre ?? ""}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
        >
          <option value="">Все жанры</option>
          {filters.genres.map((genre) => (
            <option key={genre.slug} value={genre.slug}>
              {genre.name}
            </option>
          ))}
        </select>

        <label htmlFor="catalog-filter-author" className="sr-only">
          Автор
        </label>
        <select
          id="catalog-filter-author"
          name="author"
          defaultValue={params.author ?? ""}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
        >
          <option value="">Все авторы</option>
          {filters.authors.map((author) => (
            <option key={author.slug} value={author.slug}>
              {author.name}
            </option>
          ))}
        </select>

        <label htmlFor="catalog-filter-year" className="sr-only">
          Год
        </label>
        <select
          id="catalog-filter-year"
          name="year"
          defaultValue={params.year ?? ""}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm"
        >
          <option value="">Любой год</option>
          {filters.years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-cyan-400 px-4 py-3 text-sm font-medium text-slate-950">
          Найти
        </button>
      </form>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
        Голосовой поиск работает в блоке результатов ниже и не сбрасывает выбранные фильтры жанра, автора и года.
      </div>
    </div>
  );
}
