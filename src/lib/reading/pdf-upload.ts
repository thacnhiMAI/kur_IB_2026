export const MAX_PDF_UPLOAD_MIB = 500;
export const MAX_PDF_UPLOAD_BYTES = MAX_PDF_UPLOAD_MIB * 1024 * 1024;
export const PDF_MIME_TYPE = "application/pdf";
export const BLOB_PDF_PREFIX = "blob:";

export function isReadingPdfPath(pathname: string, userId: string) {
  const prefix = `reading/${encodeURIComponent(userId)}/`;
  return pathname.startsWith(prefix) && /^[0-9a-f-]{36}\.pdf$/.test(pathname.slice(prefix.length));
}

export async function hasPdfSignature(file: Blob) {
  return (await file.slice(0, 5).text()) === "%PDF-";
}
