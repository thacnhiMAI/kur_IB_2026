"use client";

import React, { useId, useRef, useState } from "react";

type CoverImageFieldProps = {
  defaultValue: string;
};

export function CoverImageField({ defaultValue }: CoverImageFieldProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]"
      >
        URL обложки
      </label>
      <div className="relative">
        <input
          id={inputId}
          name="coverImage"
          placeholder="URL обложки"
          defaultValue={defaultValue}
          className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3 pr-12"
        />
        <input
          ref={fileInputRef}
          type="file"
          name="coverFile"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setFileName(file?.name ?? null);
          }}
        />
        <button
          type="button"
          aria-label="Загрузить обложку"
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[var(--text-primary)]/80 transition hover:text-[var(--text-primary)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3v10m0-10 4 4m-4-4-4 4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 14v3a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-3"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      {fileName ? (
        <p className="text-xs text-[var(--text-secondary)]">
          Файл: <span className="text-[var(--text-primary)]">{fileName}</span>
        </p>
      ) : null}
      <p className="text-xs text-[var(--text-muted)]">
        Если выбран файл, загруженная обложка имеет приоритет над URL.
      </p>
    </div>
  );
}
