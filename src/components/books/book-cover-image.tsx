"use client";

import Image, { type ImageProps } from "next/image";
import React, { useState } from "react";

import { isExternalBookImage, resolveBookImageSrc } from "@/lib/books/image-source";

type BookCoverImageProps = Omit<ImageProps, "src" | "onError"> & {
  src?: string | null;
  fallback: string;
};

export function BookCoverImage({ src, fallback, unoptimized, ...props }: BookCoverImageProps) {
  const source = resolveBookImageSrc(src, fallback);
  const [failedSource, setFailedSource] = useState<string>();
  const displayedSource = failedSource === source ? fallback : source;
  const external = isExternalBookImage(displayedSource);

  return (
    <Image
      {...props}
      src={displayedSource}
      unoptimized={unoptimized || external}
      referrerPolicy={external ? "no-referrer" : props.referrerPolicy}
      onError={displayedSource === fallback ? undefined : () => setFailedSource(source)}
    />
  );
}
