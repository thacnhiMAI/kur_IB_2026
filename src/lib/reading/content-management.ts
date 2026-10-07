import { db } from "@/lib/db";
import { storeBookPdf } from "@/lib/reading/storage";

export async function syncBookContentSources({
  bookId,
  slug,
  userId,
  pdfFile,
  externalUrl,
  makePdfPrimary
}: {
  bookId: string;
  slug: string;
  userId: string;
  pdfFile: File | null;
  externalUrl: string;
  makePdfPrimary: boolean;
}) {
  const trimmedExternalUrl = externalUrl.trim();

  if (pdfFile && pdfFile.size > 0) {
    const storedFile = await storeBookPdf({
      slug,
      file: pdfFile
    });

    if (makePdfPrimary) {
      await db.bookContent.updateMany({
        where: {
          bookId,
          isPrimary: true
        },
        data: {
          isPrimary: false
        }
      });
    }

    const hasPrimarySource = await db.bookContent.findFirst({
      where: {
        bookId,
        isPrimary: true
      },
      select: { id: true }
    });

    await db.bookContent.create({
      data: {
        bookId,
        sourceType: "PDF",
        storagePath: storedFile.storagePath,
        publicUrl: null,
        fileName: storedFile.fileName,
        mimeType: storedFile.mimeType,
        uploadedByUserId: userId,
        isPrimary: makePdfPrimary || !hasPrimarySource,
        status: "READY"
      }
    });
  }

  if (trimmedExternalUrl) {
    const existingExternal = await db.bookContent.findFirst({
      where: {
        bookId,
        sourceType: "EXTERNAL_LINK"
      },
      orderBy: { updatedAt: "desc" }
    });

    if (existingExternal) {
      await db.bookContent.update({
        where: { id: existingExternal.id },
        data: {
          externalUrl: trimmedExternalUrl,
          status: "READY"
        }
      });
    } else {
      const hasAnyPrimary = await db.bookContent.findFirst({
        where: {
          bookId,
          isPrimary: true
        },
        select: { id: true }
      });

      await db.bookContent.create({
        data: {
          bookId,
          sourceType: "EXTERNAL_LINK",
          externalUrl: trimmedExternalUrl,
          status: "READY",
          isPrimary: !hasAnyPrimary
        }
      });
    }
  }
}
