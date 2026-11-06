"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RecommendationSource({ provider, status, strategy }: {
  provider: string;
  status: string;
  strategy: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (status !== "enriching") return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      router.refresh();
      if (++attempts === 10) window.clearInterval(timer);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [router, status]);

  const label = status === "enriching"
    ? "Модель уточняет подборку. Пока показан локальный результат."
    : status === "failed"
      ? "ИИ-сервис недоступен. Показана локальная подборка."
      : strategy === "ai-enriched"
        ? `Книги подобраны моделью ${provider === "openai" ? "OpenAI" : provider}.`
        : "Книги подобраны локальной системой рекомендаций.";

  return <p role="status" className="text-sm text-[var(--text-secondary)]">{label}</p>;
}
