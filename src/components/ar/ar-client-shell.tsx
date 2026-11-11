"use client";

import React from "react";

import { ARPresenter } from "@/components/ar/ar-presenter";
import { ARPreview2D } from "@/components/ar/ar-preview-2d";
import { ARPreview3D } from "@/components/ar/ar-preview-3d";
import { ARPreviewWebXR } from "@/components/ar/ar-preview-webxr";
import { decideARPreviewMode } from "@/lib/ar/capabilities";
import type { ARCapabilityDecision } from "@/lib/ar/capabilities";
import type { ARBookPayload, ARPreviewMode } from "@/lib/ar/types";

const INITIAL_DECISION: ARCapabilityDecision = {
  mode: "3d-fallback",
  reason: "xr-unsupported",
  renderer: "book-solid"
};

type CapabilityState = {
  css3d: boolean;
  webgl: boolean;
  navigatorXR: boolean;
  immersiveAR: boolean;
};

const INITIAL_CAPABILITIES: CapabilityState = {
  css3d: false,
  webgl: false,
  navigatorXR: false,
  immersiveAR: false
};

function getMediaMatches(query: string) {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : false;
}

function detectWebGL() {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

function detectCss3D() {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return true;
  return CSS.supports("transform-style", "preserve-3d") && CSS.supports("perspective", "1000px");
}

export function ARClientShell({
  book,
  pdfUrl,
  isAuthenticated
}: {
  book: ARBookPayload;
  pdfUrl?: string | null;
  isAuthenticated: boolean;
}) {
  const [decision, setDecision] = React.useState<ARCapabilityDecision>(INITIAL_DECISION);
  const [capabilities, setCapabilities] = React.useState<CapabilityState>(INITIAL_CAPABILITIES);
  const [manualMode, setManualMode] = React.useState<"auto" | "3d" | "2d">("auto");

  React.useEffect(() => {
    let active = true;

    async function loadDecision() {
      const css3d = detectCss3D();
      const webgl = detectWebGL();
      const xr = navigator.xr;
      const navigatorXR = Boolean(xr);
      let immersiveAR = false;

      try {
        immersiveAR = typeof xr?.isSessionSupported === "function"
          ? await xr.isSessionSupported("immersive-ar")
          : false;
      } catch {
        immersiveAR = false;
      }

      if (!active) return;
      setCapabilities({ css3d, webgl, navigatorXR, immersiveAR });

      const auto = await decideARPreviewMode({
        isDesktopLike: getMediaMatches("(pointer:fine)"),
        hasNavigatorXR: navigatorXR,
        canUseImmersiveAR: immersiveAR,
        hasWebGL: webgl,
        prefersReducedMotion: getMediaMatches("(prefers-reduced-motion: reduce)")
      });

      if (!active) return;

      // CSS 3D does not require WebGL. If immersive AR is unavailable but the browser
      // supports preserve-3d, prefer the real 3D book fallback instead of a flat card.
      if (auto.mode === "2d-fallback" && css3d) {
        setDecision({ mode: "3d-fallback", reason: auto.reason, renderer: "book-solid" });
      } else {
        setDecision(auto);
      }
    }

    void loadDecision();
    return () => {
      active = false;
    };
  }, []);

  const effectiveMode: ARPreviewMode =
    manualMode === "3d" ? "3d-fallback" : manualMode === "2d" ? "2d-fallback" : decision.mode;

  const handleWebXRFallback = React.useCallback((reason: "camera-denied" | "renderer-init-failed") => {
    setDecision({ mode: "3d-fallback", reason, renderer: "book-solid" });
    setManualMode("3d");
  }, []);

  return (
    <section className="space-y-6">
      <div className="concept-panel-soft rounded-[26px] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="concept-kicker">Проверка 3D / AR</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              CSS 3D отвечает только за объёмную книгу. WebXR + immersive-ar нужны для настоящего AR через камеру. На desktop Edge 3D может работать, даже если immersive AR недоступен.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="concept-pill rounded-full px-3 py-1">CSS 3D: {capabilities.css3d ? "Да" : "Нет"}</span>
            <span className="concept-pill rounded-full px-3 py-1">WebGL: {capabilities.webgl ? "Да" : "Нет"}</span>
            <span className="concept-pill rounded-full px-3 py-1">WebXR: {capabilities.navigatorXR ? "Да" : "Нет"}</span>
            <span className="concept-pill rounded-full px-3 py-1">immersive-ar: {capabilities.immersiveAR ? "Да" : "Нет"}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["auto", "3d", "2d"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setManualMode(mode)}
              className={`${manualMode === mode ? "concept-button-primary" : "concept-button-secondary"} rounded-full px-4 py-2 text-sm font-medium`}
            >
              {mode === "auto" ? "Авто" : mode === "3d" ? "Проверить 3D" : "Проверить 2D"}
            </button>
          ))}
        </div>
      </div>

      <ARPresenter book={book} mode={effectiveMode} reason={decision.reason} />

      {effectiveMode === "webxr" ? (
        <ARPreviewWebXR book={book} pdfUrl={pdfUrl} onFallback={handleWebXRFallback} />
      ) : effectiveMode === "2d-fallback" ? (
        <ARPreview2D book={book} />
      ) : (
        <ARPreview3D
          book={book}
          renderer="book-solid"
          pdfUrl={pdfUrl}
          isAuthenticated={isAuthenticated}
        />
      )}
    </section>
  );
}
