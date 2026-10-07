"use client";

import React, { useId, useMemo, useState } from "react";

import { matchesAdminQuery } from "@/lib/admin/admin-search";

type FilterableCheckboxItem = {
  id: string;
  name: string;
  slug: string;
};

type FilterableCheckboxListProps = {
  legend: string;
  name: string;
  items: FilterableCheckboxItem[];
  initialSelectedIds: string[];
  placeholder: string;
};

export function FilterableCheckboxList({
  legend,
  name,
  items,
  initialSelectedIds,
  placeholder
}: FilterableCheckboxListProps) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set(initialSelectedIds));

  const filtered = useMemo(
    () => items.filter((item) => matchesAdminQuery(`${item.name} ${item.slug}`, query)),
    [items, query]
  );

  return (
    <fieldset className="rounded-[24px] border border-[var(--surface-border)] bg-[rgba(255,255,255,0.02)] p-4">
      <legend className="px-2 text-sm font-medium text-[var(--text-primary)]">{legend}</legend>

      {[...selectedIds].map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <div className="mt-4 space-y-3">
        <label htmlFor={searchId} className="sr-only">
          {placeholder}
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent-border)] focus:ring-2 focus:ring-[var(--accent-soft)]"
        />

        <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {filtered.map((item) => (
            <label key={item.id} className="flex items-center gap-3 text-sm text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={selectedIds.has(item.id)}
                onChange={(event) => {
                  setSelectedIds((previous) => {
                    const next = new Set(previous);

                    if (event.target.checked) {
                      next.add(item.id);
                    } else {
                      next.delete(item.id);
                    }

                    return next;
                  });
                }}
                className="h-4 w-4 rounded border-slate-600 bg-[var(--surface-2)]"
              />
              <span>{item.name}</span>
              <span className="text-xs text-[var(--text-muted)]">{item.slug}</span>
            </label>
          ))}

          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Ничего не найдено.</p>
          ) : null}
        </div>
      </div>
    </fieldset>
  );
}
