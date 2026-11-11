"use client";

import dynamic from "next/dynamic";

export type PdfReaderShellProps = {
  title: string;
  slug: string;
  language: string;
  fileUrl: string;
  bookId: string;
  contentId: string | null;
  cacheScope?: string;
  initialPage?: number;
  isAuthenticated: boolean;
};

const PdfFlipReader = dynamic(() => import("./pdf-flip-reader"), {
  ssr: false,
  loading: () => (
    <div className="concept-panel rounded-[30px] p-10 text-center text-[var(--text-secondary)]">
      Загрузка книги...
    </div>
  )
});

export function PdfReaderShell(props: PdfReaderShellProps) {
  return (
    <PdfFlipReader
      key={`${props.bookId}:${props.contentId ?? ""}:${props.cacheScope ?? ""}:${props.fileUrl}`}
      {...props}
    />
  );
}
