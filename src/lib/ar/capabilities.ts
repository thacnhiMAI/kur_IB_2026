import type { ARFallbackReason, ARPreviewMode } from "@/lib/ar/types";

export type ARRendererVariant = "book-solid" | "floating-card";

export type ARCapabilitySnapshot = {
  isDesktopLike: boolean;
  hasNavigatorXR: boolean;
  canUseImmersiveAR: boolean;
  hasWebGL: boolean;
  prefersReducedMotion: boolean;
};

export type ARCapabilityDecision = {
  mode: ARPreviewMode;
  reason: ARFallbackReason | null;
  renderer: ARRendererVariant;
};

export async function decideARPreviewMode(
  snapshot: ARCapabilitySnapshot
): Promise<ARCapabilityDecision> {
  if (
    snapshot.hasNavigatorXR &&
    snapshot.canUseImmersiveAR &&
    !snapshot.isDesktopLike
  ) {
    return {
      mode: "webxr",
      reason: null,
      renderer: snapshot.prefersReducedMotion ? "floating-card" : "book-solid"
    };
  }

  if (snapshot.hasWebGL) {
    return {
      mode: "3d-fallback",
      reason: snapshot.hasNavigatorXR
        ? "immersive-ar-unavailable"
        : "xr-unsupported",
      renderer: snapshot.prefersReducedMotion ? "floating-card" : "book-solid"
    };
  }

  return {
    mode: "2d-fallback",
    reason: "webgl-unsupported",
    renderer: "floating-card"
  };
}
