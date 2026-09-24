import Link from "next/link";

import { buildPageMetadata } from "@/lib/site/metadata";

export const metadata = buildPageMetadata({
  title: "Главная",
  description: "Каталог книг, рекомендации, AR-превью и PWA-функции выпускного проекта.",
  path: "/"
});

export default function HomePage() {
  return (
    <section className="grid gap-10 md:grid-cols-[1.3fr_0.7fr] md:items-center">
      <div className="space-y-6">
        <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
          MVP умной библиотеки
        </span>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Умная библиотека</h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-300">
            Каталог книг с персональными рекомендациями, отзывами, избранным и
            фундаментом для AI-функций выпускного проекта.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/catalog"
            className="rounded-lg bg-cyan-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-300"
          >
            Каталог
          </Link>
          <Link
            href="/recommendations"
            className="rounded-lg border border-slate-700 px-5 py-3 font-medium transition hover:border-cyan-300 hover:text-cyan-200"
          >
            Рекомендации
          </Link>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/20">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Что уже заложено</p>
          <ul className="space-y-3 text-slate-200">
            <li>Каталог с фильтрацией и карточками книг</li>
            <li>Профиль читателя и избранное</li>
            <li>Отзывы, история чтения и рекомендации</li>
            <li>Подготовка к AI, AR, голосу и PWA</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
