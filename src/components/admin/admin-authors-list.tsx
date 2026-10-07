"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

import { deleteAdminAuthor } from "@/app/admin/authors/actions";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";
import { matchesAdminQuery } from "@/lib/admin/admin-search";

type AdminAuthorListItem = {
  id: string;
  name: string;
  slug: string;
  booksCount: number;
};

export function AdminAuthorsList({ authors }: { authors: AdminAuthorListItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => authors.filter((author) => matchesAdminQuery(`${author.name} ${author.slug}`, query)),
    [authors, query]
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
        {filtered.map((author) => (
          <article key={author.id} className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-1)] p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">{author.name}</h2>
                <p className="text-sm text-[var(--text-muted)]">{author.slug}</p>
                <p className="text-sm text-[var(--text-secondary)]">Связанных книг: {author.booksCount}</p>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link
                  href={`/admin/authors/${author.id}/edit`}
                  className="rounded-lg border border-[var(--surface-border-strong)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]"
                >
                  Редактировать
                </Link>
                <form action={deleteAdminAuthor.bind(null, author.id)}>
                  <DeleteSubmitButton
                    idleLabel="Удалить"
                    pendingLabel="Удаление..."
                    confirmMessage={`Удалить автора "${author.name}"?`}
                  />
                </form>
              </div>
            </div>
          </article>
        ))}

        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-1)] p-5 text-sm text-[var(--text-muted)]">
            Авторы не найдены.
          </p>
        ) : null}
      </div>
    </div>
  );
}
