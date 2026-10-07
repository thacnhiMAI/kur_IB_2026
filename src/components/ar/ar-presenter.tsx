import React from "react";

import type {
  ARBookPayload,
  ARFallbackReason,
  ARPreviewMode
} from "@/lib/ar/types";

const MODE_COPY: Record<ARPreviewMode, string> = {
  webxr: "Immersive AR is available for this book.",
  "3d-fallback":
    "Immersive AR is unavailable on this device. Opening the 3D Reader Lite preview instead.",
  "2d-fallback": "Your device is using the readable 2D fallback preview."
};

export function ARPresenter({
  book,
  mode,
  reason
}: {
  book: ARBookPayload;
  mode: ARPreviewMode;
  reason: ARFallbackReason | null;
}) {
  return (
    <header className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/80 p-8 shadow-[0_24px_80px_rgba(2,6,23,0.35)]">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-cyan-300">
          AR Preview
        </p>
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
          {mode}
        </span>
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-white md:text-4xl">{book.title}</h1>
        {book.subtitle ? <p className="text-lg text-slate-300">{book.subtitle}</p> : null}
        <p className="text-sm text-slate-400">{book.authors.join(", ")}</p>
      </div>
      <p className="max-w-3xl text-sm leading-7 text-slate-300">{book.description}</p>
      <p className="text-sm text-slate-400">{MODE_COPY[mode]}</p>
      {reason ? (
        <p className="text-sm text-amber-200">Fallback reason: {reason}</p>
      ) : null}
    </header>
  );
}
