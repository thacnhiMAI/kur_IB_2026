import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const READING_STORAGE_DIR = path.join(process.cwd(), "storage", "reading");

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
    mimeType: file.type || "application/pdf"
  };
}
