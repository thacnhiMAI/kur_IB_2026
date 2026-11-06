"use client";

import { type FormEvent, useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { UnifiedSearch } from "@/components/search/unified-search";
import type { CatalogPageData, CatalogSearchParams } from "@/lib/catalog/queries";

type CatalogFiltersProps = {
  filters: CatalogPageData["filters"];
  params: CatalogSearchParams;
};

export function CatalogFilters({ filters, params }: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef(params.q ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function navigate(nextParams: URLSearchParams) {
    nextParams.delete("cursor");
    nextParams.delete("direction");
    const query = nextParams.toString();

    startTransition(() => {
      router.replace(query ? `${pathname}?${query}#catalog-results` : `${pathname}#catalog-results`, {
        scroll: false
      });
    });
  }

  function updateServerSearch(nextQuery: string) {
    latestQueryRef.current = nextQuery;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams?.toString());
      const normalized = nextQuery.trim();

      if (normalized) nextParams.set("q", normalized);
      else nextParams.delete("q");

      navigate(nextParams);
    }, 350);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextParams = new URLSearchParams(searchParams?.toString());
    const currentQuery = latestQueryRef.current.trim();
    if (currentQuery) nextParams.set("q", currentQuery);
    else nextParams.delete("q");

    for (const key of ["genre", "author", "year"] as const) {
      const value = String(form.get(key) ?? "").trim();
      if (value) nextParams.set(key, value);
      else nextParams.delete(key);
    }

    navigate(nextParams);
  }

  return (
    <section className="concept-panel-soft rounded-[26px] p-4 sm:p-5">
      <div className="grid gap-5">
        <UnifiedSearch
          label="Поиск и фильтры каталога"
          placeholder="Название, автор, жанр или описание"
          initialQuery={params.q ?? ""}
          onQueryChange={updateServerSearch}
        />

        <form
          onSubmit={applyFilters}
          className="grid gap-3 border-t border-[var(--surface-border)] pt-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto]"
        >
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Жанр</span>
            <select name="genre" defaultValue={params.genre ?? ""} className="concept-input rounded-xl px-4 py-3 text-sm">
              <option value="">Все жанры</option>
              {filters.genres.map((genre) => (
                <option key={genre.slug} value={genre.slug}>{genre.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Автор</span>
            <select name="author" defaultValue={params.author ?? ""} className="concept-input rounded-xl px-4 py-3 text-sm">
              <option value="">Все авторы</option>
              {filters.authors.map((author) => (
                <option key={author.slug} value={author.slug}>{author.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Год</span>
            <select name="year" defaultValue={params.year ?? ""} className="concept-input rounded-xl px-4 py-3 text-sm">
              <option value="">Любой год</option>
              {filters.years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isPending}
              className="concept-button-primary w-full rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-70 md:w-auto"
            >
              {isPending ? "Обновляем..." : "Применить"}
            </button>
          </div>
        </form>
      </div>

      <p className="mt-4 text-xs leading-6 text-[var(--text-muted)]">
        Один поиск управляет только разделом «Все книги». Featured collection загружается отдельно и не меняется от текста или фильтров.
      </p>
    </section>
  );
}
