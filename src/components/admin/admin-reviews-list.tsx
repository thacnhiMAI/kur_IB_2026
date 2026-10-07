"use client";

import { useMemo, useState } from "react";

import { deleteAdminReview, moderateAdminReview } from "@/app/admin/reviews/actions";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";

type ReviewItem = {
  id: string;
  rating: number;
  content: string;
  status: "PENDING" | "PUBLISHED" | "HIDDEN" | "REJECTED";
  createdAt: string;
  userName: string;
  userEmail: string;
  bookTitle: string;
  bookSlug: string;
};

export function AdminReviewsList({ reviews }: { reviews: ReviewItem[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const filtered = useMemo(() => reviews.filter((review) => {
    const needle = query.trim().toLowerCase();
    const matches = !needle || `${review.content} ${review.userName} ${review.userEmail} ${review.bookTitle}`.toLowerCase().includes(needle);
    return matches && (status === "ALL" || review.status === status);
  }), [query, reviews, status]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="concept-input rounded-2xl px-4 py-3" placeholder="Поиск по книге, читателю или тексту..." />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="concept-input rounded-2xl px-4 py-3">
          <option value="ALL">Все статусы</option><option value="PENDING">PENDING</option><option value="PUBLISHED">PUBLISHED</option><option value="HIDDEN">HIDDEN</option><option value="REJECTED">REJECTED</option>
        </select>
      </div>
      {filtered.map((review) => (
        <article key={review.id} className="editorial-surface rounded-[26px] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="rounded-full border border-[var(--surface-border)] px-2.5 py-1">{review.status}</span>
                <span>{"★".repeat(review.rating)}{"☆".repeat(Math.max(0, 5 - review.rating))}</span>
                <span>{new Date(review.createdAt).toLocaleString("ru-RU")}</span>
              </div>
              <h2 className="text-2xl text-[var(--text-primary)]">{review.bookTitle}</h2>
              <p className="text-sm text-[var(--text-secondary)]">{review.userName} · {review.userEmail}</p>
              <p className="whitespace-pre-wrap leading-7 text-[var(--text-secondary)]">{review.content}</p>
            </div>
            <div className="flex min-w-fit flex-wrap gap-2 lg:max-w-[310px] lg:justify-end">
              {(["PUBLISHED", "HIDDEN", "REJECTED", "PENDING"] as const).map((nextStatus) => (
                <form key={nextStatus} action={moderateAdminReview.bind(null, review.id)}>
                  <input type="hidden" name="status" value={nextStatus} />
                  <button className="editorial-button-secondary rounded-xl px-3 py-2 text-xs">{nextStatus}</button>
                </form>
              ))}
              <form action={deleteAdminReview.bind(null, review.id)}>
                <DeleteSubmitButton idleLabel="Удалить" pendingLabel="Удаляем..." confirmMessage="Удалить этот отзыв без возможности восстановления?" />
              </form>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
