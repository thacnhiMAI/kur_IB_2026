import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { get, head } from "@vercel/blob";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { BLOB_PDF_PREFIX, PDF_MIME_TYPE } from "@/lib/reading/pdf-upload";

function isPathInside(basePath: string, targetPath: string) {
  const relative = path.relative(basePath, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function parseRangeHeader(rangeHeader: string, fileSize: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || (!match[1] && !match[2])) {
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

async function streamBlobPdf(pathname: string, request: Request, headers: Headers) {
  const rangeHeader = request.headers.get("range");
  try {
    const rangeOptions: Record<string, string> = {};
    if (rangeHeader) {
      const { size } = await head(pathname);
      const range = parseRangeHeader(rangeHeader, size);
      if (!range) {
        headers.set("Content-Range", `bytes */${size}`);
        return new Response(null, { status: 416, headers });
      }
      rangeOptions.Range = `bytes=${range.start}-${range.end}`;
    }

    const result = await get(pathname, {
      access: "private",
      headers: rangeOptions,
      abortSignal: request.signal
    });
    if (result?.statusCode !== 200) return new Response("File not found", { status: 404 });
    const contentRange = result.headers.get("content-range");
    if (contentRange) headers.set("Content-Range", contentRange);
    const length = result.headers.get("content-length");
    if (length) headers.set("Content-Length", length);
    return new Response(result.stream, { status: contentRange ? 206 : 200, headers });
  } catch {
    return new Response("Could not read stored PDF", { status: 502 });
  }
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

  const encodedFileName = encodeURIComponent(content.fileName || "book.pdf");
  const commonHeaders = {
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Type": content.mimeType || PDF_MIME_TYPE,
    "Content-Disposition": `inline; filename*=UTF-8''${encodedFileName}`,
    "X-Content-Type-Options": "nosniff"
  };
  if (content.storagePath.startsWith(BLOB_PDF_PREFIX)) {
    return streamBlobPdf(content.storagePath.slice(BLOB_PDF_PREFIX.length), request, new Headers(commonHeaders));
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
