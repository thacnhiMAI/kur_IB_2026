"use client";
import { RefreshCw } from "lucide-react";
import { useFormStatus } from "react-dom";

export function RecommendationRefreshButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} aria-busy={pending} className="concept-button-primary inline-flex min-h-14 items-center gap-3 rounded-[14px] px-6 text-base font-semibold disabled:opacity-60">
      <RefreshCw size={20} className={pending ? "animate-spin" : undefined} />
      <span aria-live="polite">{pending ? "Анализируем ваши книги…" : "Обновить рекомендации"}</span>
    </button>
  );
}
