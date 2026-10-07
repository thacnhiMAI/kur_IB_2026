import { describe, expect, it } from "vitest";

import { resolvePrimaryBookContent } from "@/lib/reading/content-source";

describe("resolvePrimaryBookContent", () => {
  it("accepts a ready PDF with private storage and no public URL", () => {
    const result = resolvePrimaryBookContent([
      {
        id: "pdf-1",
        sourceType: "PDF",
        status: "READY",
        isPrimary: true,
        storagePath: "/private/reading/book.pdf",
        publicUrl: null,
        externalUrl: null
      }
    ]);

    expect(result?.id).toBe("pdf-1");
  });

  it("falls back to a ready external source", () => {
    const result = resolvePrimaryBookContent([
      {
        id: "ext-1",
        sourceType: "EXTERNAL_LINK",
        status: "READY",
        isPrimary: true,
        storagePath: null,
        publicUrl: null,
        externalUrl: "https://example.com/read"
      }
    ]);

    expect(result?.id).toBe("ext-1");
  });
});
