"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { hasPdfSignature, MAX_PDF_UPLOAD_BYTES, PDF_MIME_TYPE } from "@/lib/reading/pdf-upload";

export function BookFormUpload({
  action,
  children,
  uploadOwner,
  submitLabel
}: {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  uploadOwner?: string;
  submitLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<number>();
  const previousUpload = useRef<{ file: File; pathname: string }>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const formData = new FormData(event.currentTarget);
    setError("");
    setProgress(undefined);

    startTransition(async () => {
      const file = formData.get("pdfFile");
      if (file instanceof File && file.size > 0) {
        try {
          if (file.size > MAX_PDF_UPLOAD_BYTES || !(await hasPdfSignature(file))) {
            setError("Выберите корректный PDF-файл размером до 100 МБ.");
            return;
          }

          if (uploadOwner) {
            let stored = previousUpload.current;
            if (stored?.file !== file) {
              const pathname = `reading/${encodeURIComponent(uploadOwner)}/${crypto.randomUUID()}.pdf`;
              const blob = await upload(pathname, file, {
                access: "private",
                contentType: PDF_MIME_TYPE,
                handleUploadUrl: "/api/admin/reading/upload",
                multipart: file.size > 4 * 1024 * 1024,
                onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage))
              });
              stored = { file, pathname: blob.pathname };
              previousUpload.current = stored;
            }
            formData.delete("pdfFile");
            formData.set("pdfBlobPath", stored.pathname);
            formData.set("pdfFileName", file.name);
          }
        } catch {
          setError("Не удалось загрузить PDF. Проверьте подключение и повторите попытку.");
          return;
        }
      }

      await action(formData);
    });
  }

  return (
    <form action={action} onSubmit={submit} className="editorial-surface space-y-5 rounded-[30px] p-7">
      {children}
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {pending && progress !== undefined && (
        <p role="status" className="text-sm text-[var(--text-secondary)]">Загрузка PDF: {progress}%</p>
      )}
      <button disabled={pending} className="editorial-button-primary rounded-full px-5 py-3 font-medium text-white disabled:opacity-50">
        {pending ? "Сохранение…" : submitLabel}
      </button>
    </form>
  );
}
