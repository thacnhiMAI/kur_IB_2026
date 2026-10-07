"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

import { deleteAdminGenre } from "@/app/admin/genres/actions";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";
import { matchesAdminQuery } from "@/lib/admin/admin-search";

type AdminGenreListItem = {
  id: string;
  name: string;
  slug: string;
  booksCount: number;
};

export function AdminGenresList({ genres }: { genres: AdminGenreListItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => genres.filter((genre) => matchesAdminQuery(`${genre.name} ${genre.slug}`, query)),
    [genres, query]
  );

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Поиск: имя или slug..."
        className="w-full rounded-[18px] border border-[var(--surface-border)] bg-[var(--surface-2)] px-5 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-soft)]"
      />

      <div className="space-y-4">
        {filtered.map((genre) => (
          <article key={genre.id} className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-1)] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">{genre.name}</h2>
                <p className="text-sm text-[var(--text-muted)]">{genre.slug}</p>
                <p className="text-sm text-[var(--text-secondary)]">Связанных книг: {genre.booksCount}</p>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link
                  href={`/admin/genres/${genre.id}/edit`}
                  className="rounded-lg border border-[var(--surface-border-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]"
                >
                  Редактировать
                </Link>
                <form action={deleteAdminGenre.bind(null, genre.id)}>
                  <DeleteSubmitButton
                    idleLabel="Удалить"
                    pendingLabel="Удаление..."
                    confirmMessage={`Удалить жанр "${genre.name}"?`}
                  />
                </form>
              </div>
            </div>
          </article>
        ))}

        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-1)] p-5 text-sm text-[var(--text-muted)]">
            Жанры не найдены.
          </p>
        ) : null}
      </div>
    </div>
  );
}
