import { describe, expect, it } from "vitest";

import { decideARPreviewMode } from "@/lib/ar/capabilities";

describe("decideARPreviewMode", () => {
  it("prefers webxr when immersive-ar is supported", async () => {
    const result = await decideARPreviewMode({
      isDesktopLike: false,
      hasNavigatorXR: true,
      canUseImmersiveAR: true,
      hasWebGL: true,
      prefersReducedMotion: false
    });

    expect(result).toEqual({
      mode: "webxr",
      reason: null,
      renderer: "book-solid"
    });
  });

  it("keeps webxr preferred on supported mobile-like devices with reduced motion", async () => {
    const result = await decideARPreviewMode({
      isDesktopLike: false,
      hasNavigatorXR: true,
      canUseImmersiveAR: true,
      hasWebGL: true,
      prefersReducedMotion: true
    });

    expect(result).toEqual({
      mode: "webxr",
      reason: null,
      renderer: "floating-card"
    });
  });

  it("falls back to 3d viewer when immersive-ar is unavailable but webgl exists", async () => {
    const result = await decideARPreviewMode({
      isDesktopLike: false,
      hasNavigatorXR: true,
      canUseImmersiveAR: false,
      hasWebGL: true,
      prefersReducedMotion: false
    });

    expect(result.mode).toBe("3d-fallback");
    expect(result.reason).toBe("immersive-ar-unavailable");
  });

  it("falls back to 2d preview when webgl is unavailable", async () => {
    const result = await decideARPreviewMode({
      isDesktopLike: true,
      hasNavigatorXR: false,
      canUseImmersiveAR: false,
      hasWebGL: false,
      prefersReducedMotion: true
    });

    expect(result).toEqual({
      mode: "2d-fallback",
      reason: "webgl-unsupported",
      renderer: "floating-card"
    });
  });
});
