"use client";

import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

export type ReaderSearchHit = { page: number; count: number; snippet: string };

export function ReaderSearchPanel({
  open,
  busy,
  hits,
  activeIndex,
  onSearch,
  onPrevious,
  onNext,
  onClose
}: {
  open: boolean;
  busy: boolean;
  hits: ReaderSearchHit[];
  activeIndex: number;
  onSearch: (query: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  function submit(event: FormEvent) {
    event.preventDefault();
    onSearch(query.trim());
  }

  if (!open) return null;

  const hit = hits[activeIndex] ?? null;
  const totalMatches = hits.reduce((sum, item) => sum + item.count, 0);

  return (
    <aside className="reader-search-panel" aria-label="Поиск в PDF">
      <form className="reader-search-form" onSubmit={submit}>
        <Search size={16} />
        <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти в PDF…" />
        <button type="submit" disabled={busy || !query.trim()}>{busy ? "…" : "Найти"}</button>
        <button type="button" className="reader-search-close" onClick={onClose} aria-label="Закрыть поиск"><X size={16} /></button>
      </form>
      {hits.length ? (
        <div className="reader-search-status">
          <div>
            <strong>{activeIndex + 1} / {hits.length}</strong>
            <span>{totalMatches} совпад.</span>
          </div>
          <div className="reader-search-nav">
            <button type="button" onClick={onPrevious} aria-label="Предыдущее совпадение"><ChevronUp size={16} /></button>
            <button type="button" onClick={onNext} aria-label="Следующее совпадение"><ChevronDown size={16} /></button>
          </div>
        </div>
      ) : !busy && query.trim() ? <p className="reader-search-empty">Совпадений нет.</p> : null}
      {hit ? <p className="reader-search-snippet"><span>Стр. {hit.page}</span>{hit.snippet}</p> : null}
    </aside>
  );
}
