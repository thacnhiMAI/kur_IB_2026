import React, { type ReactNode } from "react";

export function RecommendationHero({
  summary,
  children
}: {
  summary: string;
  children?: ReactNode;
}) {
  return (
    <section className="recommendation-reference-hero px-8 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-11">
      <div className="relative z-10 max-w-[820px] space-y-6 lg:pr-40">
        <p className="concept-kicker">Reading profile</p>
        <div className="space-y-4">
          <h1 className="font-display text-4xl leading-[1.02] tracking-[-0.035em] text-[var(--text-primary)] sm:text-5xl lg:text-[3.4rem]">
            Персональные рекомендации
          </h1>
          <p className="max-w-3xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
            {summary}
          </p>
        </div>
        {children ? <div className="pt-1">{children}</div> : null}
      </div>

      <div className="recommendation-reference-visual" aria-hidden="true">
        <div className="recommendation-orbit" />
        <div className="recommendation-book-stack"><span /><span /><span /></div>
      </div>
    </section>
  );
}
