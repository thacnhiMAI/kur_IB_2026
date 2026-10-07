import crypto from "node:crypto";

import { cacheCoverAssetFromBuffer } from "@/lib/books/cover-assets";
import { db } from "@/lib/db";

export async function applyUploadedCoverToBook(input: {
  bookId: string;
  slug: string;
  file: File;
}) {
  if (input.file.size <= 0) {
    throw new Error("Uploaded cover file is empty.");
  }

  if (!input.file.type.startsWith("image/")) {
    throw new Error("Cover upload must be an image file.");
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const identifier = `admin-${crypto.randomUUID()}`;
  const asset = await cacheCoverAssetFromBuffer({
    slug: input.slug,
    identifier,
    buffer
  });

  const existing = await db.bookCoverAsset.findFirst({
    where: {
      bookId: input.bookId,
      originalUrl: { startsWith: "uploaded://admin/" }
    },
    orderBy: { lastFetchedAt: "desc" },
    select: { id: true }
  });

  const originalUrl = `uploaded://admin/${identifier}`;

  if (existing) {
    await db.bookCoverAsset.update({
      where: { id: existing.id },
      data: {
        originalUrl,
        cachedPath: asset.cachedPath,
        publicUrl: asset.publicUrl,
        width: asset.width,
        height: asset.height,
        dominantColor: asset.dominantColor,
        blurDataUrl: asset.blurDataUrl,
        status: "ready",
        lastFetchedAt: new Date()
      }
    });
  } else {
    await db.bookCoverAsset.create({
      data: {
        bookId: input.bookId,
        originalUrl,
        cachedPath: asset.cachedPath,
        publicUrl: asset.publicUrl,
        width: asset.width,
        height: asset.height,
        dominantColor: asset.dominantColor,
        blurDataUrl: asset.blurDataUrl,
        status: "ready"
      }
    });
  }

  await db.book.update({
    where: { id: input.bookId },
    data: { coverImage: asset.publicUrl }
  });

  return asset.publicUrl;
}
