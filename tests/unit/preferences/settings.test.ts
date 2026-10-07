import { describe, expect, it } from "vitest";

import {
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  parseAppSettings
} from "@/lib/preferences/settings";

describe("app settings", () => {
  it("normalizes supported appearance and reader settings", () => {
    expect(
      normalizeAppSettings({
        theme: "contrast",
        accent: "violet",
        density: "compact",
        motion: "reduced",
        textScale: 1.2,
        readerZoom: 1.35,
        speechRate: 1.4,
        readerToolbarExpanded: false,
        readerAiEnabled: false,
        rememberRecentlyViewed: false
      })
    ).toMatchObject({
      theme: "contrast",
      accent: "violet",
      density: "compact",
      motion: "reduced",
      textScale: 1.2,
      readerZoom: 1.35,
      speechRate: 1.4,
      readerToolbarExpanded: false,
      readerAiEnabled: false,
      rememberRecentlyViewed: false
    });
  });

  it("falls back safely for invalid stored JSON", () => {
    expect(parseAppSettings("not-json")).toEqual(DEFAULT_APP_SETTINGS);
  });

  it("clamps reader controls to safe limits", () => {
    const parsed = normalizeAppSettings({ readerZoom: 99, speechRate: 0.01 });
    expect(parsed.readerZoom).toBe(1.5);
    expect(parsed.speechRate).toBe(0.6);
  });
});
