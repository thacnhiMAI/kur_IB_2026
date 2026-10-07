"use client";

import Link from "next/link";

import { deleteAdminBook } from "@/app/admin/books/actions";

function EditIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}

export function BookAdminControls({
  bookId,
  slug,
  title
}: {
  bookId: string;
  slug: string;
  title: string;
}) {
  return (
    <div className="absolute left-3 top-3 z-30 flex gap-2" aria-label="Администрирование книги">
      <Link
        href={`/admin/books/${bookId}/edit`}
        aria-label="Редактировать книгу"
        title="Редактировать книгу"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-slate-950/85 text-slate-100 shadow-lg backdrop-blur transition hover:border-[rgb(var(--accent-rgb)/0.55)] hover:text-[var(--accent-text)]"
      >
        <EditIcon />
      </Link>
      <form
        action={deleteAdminBook.bind(null, bookId, slug)}
        onSubmit={(event) => {
          if (!window.confirm(`Удалить книгу «${title}»? Это действие нельзя отменить.`)) {
            event.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          aria-label="Удалить книгу"
          title="Удалить книгу"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/25 bg-slate-950/85 text-rose-300 shadow-lg backdrop-blur transition hover:border-rose-300/55 hover:bg-rose-500/10"
        >
          <TrashIcon />
        </button>
      </form>
    </div>
  );
}
