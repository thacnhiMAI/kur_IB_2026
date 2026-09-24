import React from "react";

type RecommendationHeroProps = {
  summary: string;
  strategy: "fallback" | "ai-enriched" | string;
  status: "ready" | "enriching" | "failed" | string;
  provider: string;
  updatedAt: string;
  itemsCount: number;
};

const STRATEGY_LABELS: Record<string, string> = {
  fallback: "Fallback snapshot",
  "ai-enriched": "AI enrichment"
};

const STATUS_LABELS: Record<string, string> = {
  ready: "Готово",
  enriching: "AI дообогащает подборку",
  failed: "AI недоступен, показан fallback"
};

function formatStrategy(strategy: string) {
  return STRATEGY_LABELS[strategy] ?? strategy;
}

function formatStatus(status: string) {
  return STATUS_LABELS[status] ?? status;
}

export function RecommendationHero({
  summary,
  strategy,
  status,
  provider,
  updatedAt,
  itemsCount
}: RecommendationHeroProps) {
  return (
    <section className="rounded-[28px] border border-slate-800 bg-slate-900 p-6 shadow-[0_24px_70px_rgba(2,6,23,0.38)]">
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Reading profile</p>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-50">Персональные рекомендации</h1>
          <p className="max-w-3xl text-sm leading-7 text-slate-300 md:text-base">{summary}</p>
        </div>
        <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Стратегия</p>
            <p className="mt-2 font-medium text-slate-100">{formatStrategy(strategy)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Статус</p>
            <p className="mt-2 font-medium text-slate-100">{formatStatus(status)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Провайдер</p>
            <p className="mt-2 font-medium text-slate-100">{provider}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Обновлено</p>
            <p className="mt-2 font-medium text-slate-100">{updatedAt}</p>
            <p className="mt-1 text-xs text-slate-500">{itemsCount} книг в текущем snapshot</p>
          </div>
        </div>
      </div>
    </section>
  );
}
