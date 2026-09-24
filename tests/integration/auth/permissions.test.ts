import { describe, expect, it } from "vitest";

import { canAccessAdmin } from "@/lib/permissions";

describe("canAccessAdmin", () => {
  it("allows admin users", () => {
    expect(canAccessAdmin({ role: "ADMIN" })).toBe(true);
  });

  it("rejects normal users", () => {
    expect(canAccessAdmin({ role: "USER" })).toBe(false);
  });
});
