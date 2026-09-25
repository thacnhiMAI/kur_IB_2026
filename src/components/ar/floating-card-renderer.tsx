import Image from "next/image";
import React from "react";

import { DEFAULT_AR_COVER } from "@/lib/ar/types";
import { resolveBookImageSrc } from "@/lib/books/image-source";

export function FloatingCardRenderer({
  coverImage
}: {
  coverImage?: string | null;
}) {
  const imageSrc = resolveBookImageSrc(coverImage, DEFAULT_AR_COVER);

  return (
    <div className="relative mx-auto w-[220px] [perspective:1400px]">
      <div className="rotate-y-[-14deg] rotate-x-[8deg] overflow-hidden rounded-[24px] border border-white/15 bg-slate-900/85 shadow-[0_40px_80px_rgba(2,6,23,0.45)] [transform-style:preserve-3d]">
        <Image
          src={imageSrc}
          alt=""
          width={720}
          height={1080}
          className="h-auto w-full object-cover"
        />
      </div>
    </div>
  );
}
