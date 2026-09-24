import React from "react";

import type { RecommendationInsights } from "@/lib/recommendations/types";

type RecommendationInsightStripProps = {
  insights: RecommendationInsights;
};

type InsightBlockProps = {
  label: string;
  values: string[];
};

function InsightBlock({ label, values }: InsightBlockProps) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-sm leading-6 text-slate-100">
        {values.length > 0 ? values.join(", ") : "Нет данных"}
      </p>
    </article>
  );
}

export function RecommendationInsightStrip({ insights }: RecommendationInsightStripProps) {
  return (
    <section
      data-testid="recommendation-insight-strip"
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <InsightBlock label="Любимые жанры" values={insights.favoriteGenres} />
      <InsightBlock label="Любимые авторы" values={insights.favoriteAuthors} />
      <InsightBlock label="Завершённые книги" values={insights.finishedBooks} />
      <InsightBlock label="Высоко оценённые темы" values={insights.highRatedThemes} />
    </section>
  );
}
