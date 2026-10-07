import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { auth } from "@/auth";
import { db } from "@/lib/db";

function isPathInside(basePath: string, targetPath: string) {
  const relative = path.relative(basePath, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function parseRangeHeader(rangeHeader: string, fileSize: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) {
    return null;
  }

  const [, startText, endText] = match;
  let start: number;
  let end: number;

  if (!startText && endText) {
    const suffixLength = Number(endText);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null;
    }
    start = Math.max(fileSize - suffixLength, 0);
    end = fileSize - 1;
  } else {
    start = Number(startText);
    end = endText ? Number(endText) : fileSize - 1;
  }

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    start >= fileSize
  ) {
    return null;
  }

  return {
    start,
    end: Math.min(end, fileSize - 1)
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const content = await db.bookContent.findUnique({
    where: { id },
    select: {
      sourceType: true,
      status: true,
      storagePath: true,
      mimeType: true,
      fileName: true,
      book: {
        select: {
          isPublished: true
        }
      }
    }
  });

  if (
    !content ||
    content.sourceType !== "PDF" ||
    content.status !== "READY" ||
    !content.storagePath ||
    !content.book.isPublished
  ) {
    return new Response("Not found", { status: 404 });
  }

  const resolvedPath = path.resolve(content.storagePath);
  const privateRoot = path.resolve(process.cwd(), "storage", "reading");
  const legacyPublicRoot = path.resolve(process.cwd(), "public", "reading");

  if (
    !isPathInside(privateRoot, resolvedPath) &&
    !isPathInside(legacyPublicRoot, resolvedPath)
  ) {
    return new Response("Forbidden storage path", { status: 403 });
  }

  let fileStats;
  try {
    fileStats = await stat(resolvedPath);
  } catch {
    return new Response("File not found", { status: 404 });
  }

  const mimeType = content.mimeType || "application/pdf";
  const encodedFileName = encodeURIComponent(content.fileName || "book.pdf");
  const commonHeaders = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Type": mimeType,
    "Content-Disposition": `inline; filename*=UTF-8''${encodedFileName}`
  };
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    const range = parseRangeHeader(rangeHeader, fileStats.size);
    if (!range) {
      return new Response(null, {
        status: 416,
        headers: {
          ...commonHeaders,
          "Content-Range": `bytes */${fileStats.size}`
        }
      });
    }

    const nodeStream = createReadStream(resolvedPath, {
      start: range.start,
      end: range.end
    });
    const stream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;

    return new Response(stream, {
      status: 206,
      headers: {
        ...commonHeaders,
        "Content-Length": String(range.end - range.start + 1),
        "Content-Range": `bytes ${range.start}-${range.end}/${fileStats.size}`
      }
    });
  }

  const nodeStream = createReadStream(resolvedPath);
  const stream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;

  return new Response(stream, {
    status: 200,
    headers: {
      ...commonHeaders,
      "Content-Length": String(fileStats.size)
    }
  });
}
