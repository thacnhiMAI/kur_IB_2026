"use client";

import React from "react";

import { ARPresenter } from "@/components/ar/ar-presenter";
import { ARPreview2D } from "@/components/ar/ar-preview-2d";
import { ARPreview3D } from "@/components/ar/ar-preview-3d";
import { ARPreviewWebXR } from "@/components/ar/ar-preview-webxr";
import { decideARPreviewMode } from "@/lib/ar/capabilities";

import type { ARCapabilityDecision } from "@/lib/ar/capabilities";
import type { ARBookPayload } from "@/lib/ar/types";

const INITIAL_DECISION: ARCapabilityDecision = {
  mode: "2d-fallback",
  reason: null,
  renderer: "floating-card"
};

function getMediaMatches(query: string) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(query).matches;
}

export function ARClientShell({ book }: { book: ARBookPayload }) {
  const [decision, setDecision] =
    React.useState<ARCapabilityDecision>(INITIAL_DECISION);
  const [has3DFallback, setHas3DFallback] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    async function loadDecision() {
      try {
        const xr = navigator.xr;
        const hasWebGL =
          typeof window !== "undefined" &&
          typeof window.WebGLRenderingContext !== "undefined";
        const canUseImmersiveAR =
          typeof xr?.isSessionSupported === "function"
            ? await xr.isSessionSupported("immersive-ar")
            : false;

        if (active) {
          setHas3DFallback(hasWebGL);
        }

        const nextDecision = await decideARPreviewMode({
          isDesktopLike: getMediaMatches("(pointer:fine)"),
          hasNavigatorXR: Boolean(xr),
          canUseImmersiveAR,
          hasWebGL,
          prefersReducedMotion: getMediaMatches("(prefers-reduced-motion: reduce)")
        });

        if (active) {
          setDecision(nextDecision);
        }
      } catch {
        if (active) {
          setDecision({
            mode: "2d-fallback",
            reason: "renderer-init-failed",
            renderer: "floating-card"
          });
        }
      }
    }

    void loadDecision();

    return () => {
      active = false;
    };
  }, []);

  const handleWebXRFallback = React.useCallback(
    (reason: "camera-denied" | "renderer-init-failed") => {
      setDecision((current) => ({
        mode: has3DFallback ? "3d-fallback" : "2d-fallback",
        reason,
        renderer: current.renderer
      }));
    },
    [has3DFallback]
  );

  return (
    <section className="space-y-6">
      <ARPresenter book={book} mode={decision.mode} reason={decision.reason} />
      {decision.mode === "webxr" ? (
        <ARPreviewWebXR book={book} onFallback={handleWebXRFallback} />
      ) : decision.mode === "2d-fallback" ? (
        <ARPreview2D book={book} />
      ) : (
        <ARPreview3D book={book} renderer={decision.renderer} />
      )}
    </section>
  );
}
