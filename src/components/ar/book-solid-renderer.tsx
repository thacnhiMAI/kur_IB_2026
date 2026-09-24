import React from "react";

export function BookSolidRenderer({
  color = "#0F172A",
  title
}: {
  color?: string;
  title: string;
}) {
  return (
    <div className="relative mx-auto w-[240px] [perspective:1600px]">
      <div className="relative h-[340px] w-full rotate-y-[-22deg] rotate-x-[10deg] rounded-[28px] border border-white/10 shadow-[0_50px_100px_rgba(2,6,23,0.55)] [transform-style:preserve-3d]">
        <div
          className="absolute inset-0 overflow-hidden rounded-[28px] border border-white/10"
          style={{
            background: `linear-gradient(180deg, ${color} 0%, rgba(15,23,42,0.96) 100%)`
          }}
        >
          <div className="absolute inset-x-0 top-0 h-20 bg-white/10 blur-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-black/25 blur-2xl" />
          <div className="absolute inset-x-6 bottom-6 text-sm font-semibold uppercase tracking-[0.18em] text-white/90">
            {title}
          </div>
        </div>
        <div
          className="absolute inset-y-3 -right-5 w-10 rounded-r-[18px] border border-white/10"
          style={{
            background: `linear-gradient(180deg, rgba(255,255,255,0.85) 0%, ${color} 42%, rgba(15,23,42,0.9) 100%)`
          }}
        />
        <div className="absolute inset-x-6 -bottom-6 h-10 rounded-full bg-cyan-950/35 blur-2xl" />
      </div>
    </div>
  );
}
