import { describe, expect, it } from "vitest";

import { getBaseUrl } from "@/lib/site/url";

describe("site url", () => {
  it("prefers NEXTAUTH_URL when present", () => {
    expect(
      getBaseUrl({
        NEXTAUTH_URL: "https://smart-library.example",
        VERCEL_URL: "preview.vercel.app"
      })
    ).toBe("https://smart-library.example");
  });

  it("falls back to the production Vercel domain when present", () => {
    expect(
      getBaseUrl({
        VERCEL_PROJECT_PRODUCTION_URL: "smart-library.example"
      })
    ).toBe("https://smart-library.example");
  });

  it("falls back to https://VERCEL_URL in preview environments", () => {
    expect(getBaseUrl({ VERCEL_URL: "smart-library-preview.vercel.app" })).toBe(
      "https://smart-library-preview.vercel.app"
    );
  });
});
