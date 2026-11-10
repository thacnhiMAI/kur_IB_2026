import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { requireAdmin } from "@/lib/auth";
import { isReadingPdfPath, MAX_PDF_UPLOAD_BYTES, PDF_MIME_TYPE } from "@/lib/reading/pdf-upload";

export async function POST(request: Request) {
  const admin = await requireAdmin();

  try {
    const body: HandleUploadBody = await request.json();
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!isReadingPdfPath(pathname, admin.id)) {
          throw new Error("Invalid PDF path");
        }

        return {
          addRandomSuffix: false,
          allowOverwrite: false,
          allowedContentTypes: [PDF_MIME_TYPE],
          maximumSizeInBytes: MAX_PDF_UPLOAD_BYTES,
          validUntil: Date.now() + 30 * 60_000
        };
      }
    });
    return Response.json(result);
  } catch {
    return Response.json({ error: "Не удалось разрешить загрузку PDF." }, { status: 400 });
  }
}
