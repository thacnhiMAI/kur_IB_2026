import { describe, expect, it } from "vitest";

import {
  PHASE_E_PRIORITY_ROUTES,
  getPhaseERouteByPath
} from "@/lib/site/phase-e-routes";

describe("phase e routes", () => {
  it("keeps the audit routes in the agreed priority order", () => {
    expect(PHASE_E_PRIORITY_ROUTES.map((route) => route.path)).toEqual([
      "/",
      "/catalog",
      "/books/design-of-everyday-things",
      "/recommendations"
    ]);
  });

  it("returns metadata for a known route", () => {
    expect(getPhaseERouteByPath("/catalog")).toMatchObject({
      label: "Catalog",
      category: "public"
    });
  });
});
