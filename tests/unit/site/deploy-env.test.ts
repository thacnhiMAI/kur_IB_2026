import { describe, expect, it } from "vitest";

import {
  REQUIRED_VERCEL_ENV,
  getOptionalAiEnv
} from "@/lib/site/deploy-env";

describe("deploy env", () => {
  it("lists the required production environment variables", () => {
    expect(REQUIRED_VERCEL_ENV.map((entry) => entry.key)).toEqual([
      "DATABASE_URL",
      "AUTH_SECRET",
      "NEXTAUTH_URL"
    ]);
  });

  it("keeps AI provider credentials optional", () => {
    expect(getOptionalAiEnv()).toContain("OPENAI_API_KEY");
  });
});
