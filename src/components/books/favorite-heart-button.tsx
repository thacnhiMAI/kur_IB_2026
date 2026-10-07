"use client";

import React from "react";

type FavoriteHeartButtonProps = {
  active: boolean;
};

export function FavoriteHeartButton({ active }: FavoriteHeartButtonProps) {
  return (
    <button
      type="submit"
      aria-label={active ? "Удалить из избранного" : "Добавить в избранное"}
      className={[
        "inline-flex h-11 w-11 items-center justify-center rounded-full border transition",
        active
          ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
          : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-300/40 hover:text-cyan-100"
      ].join(" ")}
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {active ? "♥" : "♡"}
      </span>
    </button>
  );
}
