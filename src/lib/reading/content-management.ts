import type { Prisma } from "@prisma/client";

import type { StoredBookPdf } from "@/lib/reading/storage";

export async function syncBookContentSources({
  tx,
  bookId,
  userId,
  storedFile,
  externalUrl,
  makePdfPrimary
}: {
  tx: Prisma.TransactionClient;
  bookId: string;
  userId: string;
  storedFile: StoredBookPdf | null;
  externalUrl: string;
  makePdfPrimary: boolean;
}) {
  const trimmedExternalUrl = externalUrl.trim();

  if (storedFile) {
    if (makePdfPrimary) {
      await tx.bookContent.updateMany({
        where: {
          bookId,
          isPrimary: true
        },
        data: {
          isPrimary: false
        }
      });
    }

    const hasPrimarySource = await tx.bookContent.findFirst({
      where: {
        bookId,
        isPrimary: true
      },
      select: { id: true }
    });

    await tx.bookContent.create({
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
    const existingExternal = await tx.bookContent.findFirst({
      where: {
        bookId,
        sourceType: "EXTERNAL_LINK"
      },
      orderBy: { updatedAt: "desc" }
    });

    if (existingExternal) {
      await tx.bookContent.update({
        where: { id: existingExternal.id },
        data: {
          externalUrl: trimmedExternalUrl,
          status: "READY"
        }
      });
    } else {
      const hasAnyPrimary = await tx.bookContent.findFirst({
        where: {
          bookId,
          isPrimary: true
        },
        select: { id: true }
      });

      await tx.bookContent.create({
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
