import React from "react";

import { CatalogHero } from "@/components/catalog/catalog-hero";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { FeaturedShelf } from "@/components/catalog/featured-shelf";
import { SearchableCatalogResults } from "@/components/search/searchable-catalog-results";
import { getCatalogPageData } from "@/lib/catalog/service";
import { buildPageMetadata } from "@/lib/site/metadata";

export const revalidate = 300;
export const metadata = buildPageMetadata({
  title: "Каталог",
  description: "Каталог книг с фильтрами, обложками и локальным голосовым поиском.",
  path: "/catalog"
});

export default async function CatalogPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const data = await getCatalogPageData({
    genre: params.genre,
    author: params.author,
    year: params.year
  });
  const shelfBooks =
    data.featuredBooks.length > 0 ? data.featuredBooks : data.books.slice(0, 6);

  return (
    <div className="space-y-10">
      <CatalogHero
        totalBooks={data.books.length}
        featuredCount={data.featuredBooks.length}
      >
        <CatalogFilters filters={data.filters} params={params} />
      </CatalogHero>

      <FeaturedShelf books={shelfBooks} />

      <section id="catalog-results" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
              Результаты
            </p>
            <h2 className="text-2xl font-semibold text-slate-50">Все книги</h2>
          </div>
          <p className="text-sm text-slate-400">
            {data.books.length > 0
              ? `${data.books.length} книг доступно по текущим фильтрам`
              : "Измените фильтры, чтобы расширить выборку"}
          </p>
        </div>

        {data.books.length > 0 ? (
          <SearchableCatalogResults books={data.books} />
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center text-slate-300">
            По выбранным фильтрам книги не найдены.
          </div>
        )}
      </section>
    </div>
  );
}
