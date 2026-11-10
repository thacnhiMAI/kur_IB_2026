import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { get } from "@vercel/blob";

import {
  BLOB_PDF_PREFIX,
  hasPdfSignature,
  isReadingPdfPath,
  PDF_MIME_TYPE
} from "@/lib/reading/pdf-upload";

const READING_STORAGE_DIR = path.join(process.cwd(), "storage", "reading");

export type StoredBookPdf = { storagePath: string; fileName: string; mimeType: string };

export function isCloudPdfStorageEnabled() {
  return Boolean(process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN);
}

export async function prepareBookPdf(formData: FormData, slug: string, userId: string) {
  const pathname = formData.get("pdfBlobPath");
  if (typeof pathname === "string" && pathname) {
    if (!isReadingPdfPath(pathname, userId)) {
      throw new Error("Invalid PDF upload path");
    }

    const result = await get(pathname, { access: "private", headers: { Range: "bytes=0-4" } });
    if (result?.statusCode !== 200) throw new Error("Uploaded PDF was not found");
    const reader = result.stream.getReader();
    const signature = new Uint8Array(5);
    let size = 0;
    try {
      while (size < signature.length) {
        const { value, done } = await reader.read();
        if (done) break;
        const bytes = value.subarray(0, signature.length - size);
        signature.set(bytes, size);
        size += bytes.length;
      }
    } finally {
      await reader.cancel();
    }
    if (result.blob.contentType !== PDF_MIME_TYPE || new TextDecoder().decode(signature) !== "%PDF-") {
      throw new Error("Uploaded file is not a PDF");
    }

    const name = String(formData.get("pdfFileName") ?? "");
    return {
      storagePath: BLOB_PDF_PREFIX + pathname,
      fileName: Buffer.from(name.trim().slice(0, 200)).toString("utf8") || `${slug}.pdf`,
      mimeType: PDF_MIME_TYPE
    };
  }

  const file = formData.get("pdfFile");
  if (!(file instanceof File) || file.size === 0) return null;
  if (isCloudPdfStorageEnabled()) throw new Error("PDF must be uploaded directly to storage");
  if (!(await hasPdfSignature(file))) throw new Error("Uploaded file is not a PDF");
  return storeBookPdf({ slug, file });
}

function normalizeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "");
}

export async function storeBookPdf({
  slug,
  file
}: {
  slug: string;
  file: File;
}) {
  const safeSlug = normalizeSegment(slug) || "book";
  const fileName = `${safeSlug}-${Date.now()}.pdf`;
  const storagePath = path.join(READING_STORAGE_DIR, fileName);
  const arrayBuffer = await file.arrayBuffer();

  await mkdir(READING_STORAGE_DIR, { recursive: true });
  await writeFile(storagePath, Buffer.from(arrayBuffer));

  return {
    storagePath,
    fileName,
    mimeType: PDF_MIME_TYPE
  };
}
