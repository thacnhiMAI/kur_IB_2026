import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/reading/content/[id]/route";
import { prepareBookPdf } from "@/lib/reading/storage";

const { auth, findUnique, get, head } = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
  get: vi.fn(),
  head: vi.fn()
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db", () => ({ db: { bookContent: { findUnique } } }));
vi.mock("@vercel/blob", () => ({ get, head }));

const pathname = "reading/admin-1/12345678-1234-4123-a123-123456789abc.pdf";
const params = Promise.resolve({ id: "content-1" });

function storedPdf(body: string, headers?: HeadersInit) {
  return {
    statusCode: 200,
    stream: new Response(body).body,
    headers: new Headers(headers),
    blob: { contentType: "application/pdf" }
  };
}

describe("private PDF storage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.mockResolvedValue({ user: { id: "reader" } });
    findUnique.mockResolvedValue({
      sourceType: "PDF",
      status: "READY",
      storagePath: `blob:${pathname}`,
      book: { isPublished: true }
    });
  });

  it("checks the stored file before attaching it to a book", async () => {
    const form = new FormData();
    form.set("pdfBlobPath", pathname);
    form.set("pdfFileName", "Library.pdf");
    get.mockResolvedValueOnce(storedPdf("%PDF-"));

    await expect(prepareBookPdf(form, "library", "admin-1")).resolves.toEqual({
      storagePath: `blob:${pathname}`,
      fileName: "Library.pdf",
      mimeType: "application/pdf"
    });
    await expect(prepareBookPdf(form, "library", "admin-2")).rejects.toThrow("Invalid PDF upload path");
    get.mockResolvedValueOnce(storedPdf("<html"));
    await expect(prepareBookPdf(form, "library", "admin-1")).rejects.toThrow("not a PDF");
  });

  it("requires login before contacting Blob", async () => {
    auth.mockResolvedValue(null);
    const result = await GET(new Request("https://example.com"), { params });
    expect(result.status).toBe(401);
    expect(get).not.toHaveBeenCalled();
  });

  it("streams byte ranges with the original headers", async () => {
    head.mockResolvedValue({ size: 12 });
    get.mockResolvedValue(storedPdf("PDF", {
      "Content-Range": "bytes 1-3/12",
      "Content-Length": "3"
    }));
    const request = new Request("https://example.com", { headers: { Range: "bytes=1-3" } });

    const result = await GET(request, { params });
    expect(get).toHaveBeenCalledWith(pathname, expect.objectContaining({
      access: "private",
      headers: { Range: "bytes=1-3" }
    }));
    expect(result.status).toBe(206);
    expect(result.headers.get("content-range")).toBe("bytes 1-3/12");
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    await expect(result.text()).resolves.toBe("PDF");
  });

  it("returns 416 for a range past the end of the file", async () => {
    head.mockResolvedValue({ size: 12 });
    const request = new Request("https://example.com", { headers: { Range: "bytes=12-" } });

    const result = await GET(request, { params });
    expect(result.status).toBe(416);
    expect(result.headers.get("content-range")).toBe("bytes */12");
    expect(get).not.toHaveBeenCalled();
  });
});
