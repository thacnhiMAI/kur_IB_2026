import Image from "next/image";
import React from "react";

import { DEFAULT_AR_COVER } from "@/lib/ar/types";
import { resolveBookImageSrc } from "@/lib/books/image-source";

export function FloatingCardRenderer({ coverImage }: { coverImage?: string | null }) {
  const imageSrc = resolveBookImageSrc(coverImage, DEFAULT_AR_COVER);

  return (
    <div className="relative mx-auto h-[390px] w-[290px]" style={{ perspective: "1400px" }}>
      <div
        className="absolute left-1/2 top-1/2 w-[220px] -translate-x-1/2 -translate-y-1/2"
        style={{ transform: "translate(-50%, -50%) rotateX(8deg) rotateY(-20deg)", transformStyle: "preserve-3d" }}
      >
        <div
          className="overflow-hidden rounded-[24px] border border-white/15 bg-slate-900/85 shadow-[0_42px_85px_rgba(2,6,23,0.48)]"
          style={{ transform: "translateZ(12px)" }}
        >
          <Image src={imageSrc} alt="" width={720} height={1080} className="h-auto w-full object-cover" />
        </div>
        <div
          className="absolute inset-y-3 -right-3 w-6 rounded-r-lg bg-[repeating-linear-gradient(180deg,#f8fafc_0px,#e2e8f0_3px,#f8fafc_5px)]"
          style={{ transform: "rotateY(90deg)", transformOrigin: "left center" }}
        />
      </div>
      <div className="absolute bottom-2 left-1/2 h-9 w-48 -translate-x-1/2 rounded-full bg-[rgb(var(--accent-rgb)/0.16)] blur-2xl" />
    </div>
  );
}
