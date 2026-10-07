import React from "react";

export function BookSolidRenderer({
  color = "#0F172A",
  title
}: {
  color?: string;
  title: string;
}) {
  return (
    <div className="relative mx-auto h-[390px] w-[300px]" style={{ perspective: "1500px" }}>
      <div
        className="absolute left-1/2 top-1/2 h-[340px] w-[240px] -translate-x-1/2 -translate-y-1/2 transition-transform duration-500"
        style={{
          transform: "translate(-50%, -50%) rotateX(8deg) rotateY(-28deg)",
          transformStyle: "preserve-3d"
        }}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-[24px] border border-white/15 shadow-[0_50px_100px_rgba(2,6,23,0.55)]"
          style={{
            transform: "translateZ(18px)",
            backfaceVisibility: "hidden",
            background: `linear-gradient(155deg, ${color} 0%, rgba(15,23,42,0.98) 100%)`
          }}
        >
          <div className="absolute inset-x-0 top-0 h-24 bg-white/10 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-black/25 blur-2xl" />
          <div className="absolute inset-x-6 bottom-7 text-sm font-semibold uppercase tracking-[0.18em] text-white/90">
            {title}
          </div>
        </div>

        <div
          className="absolute inset-y-3 -right-[18px] w-9 rounded-r-[12px] border-y border-r border-slate-300/40 bg-[repeating-linear-gradient(180deg,#f8fafc_0px,#f8fafc_2px,#dbe3ec_3px,#f8fafc_5px)] shadow-[inset_5px_0_12px_rgba(15,23,42,0.16)]"
          style={{ transform: "rotateY(90deg)", transformOrigin: "left center" }}
        />

        <div
          className="absolute inset-y-2 -left-[13px] w-7 rounded-l-[10px] border border-white/10"
          style={{
            transform: "rotateY(-90deg)",
            transformOrigin: "right center",
            background: `linear-gradient(180deg, ${color}, rgba(2,6,23,0.98))`
          }}
        />

        <div
          className="absolute inset-0 rounded-[24px] border border-white/10 bg-slate-950/90"
          style={{ transform: "translateZ(-18px) rotateY(180deg)", backfaceVisibility: "hidden" }}
        />
      </div>

      <div className="absolute bottom-2 left-1/2 h-10 w-56 -translate-x-1/2 rounded-full bg-[rgb(var(--accent-rgb)/0.18)] blur-2xl" />
    </div>
  );
}
