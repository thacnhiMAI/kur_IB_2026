"use client";

import React from "react";

import type { ARBookPayload } from "@/lib/ar/types";

type WebXRFallbackReason = "camera-denied" | "renderer-init-failed";

type XRSessionLike = {
  addEventListener?: (type: "end", listener: () => void) => void;
  removeEventListener?: (type: "end", listener: () => void) => void;
  end?: () => Promise<void> | void;
};

export function ARPreviewWebXR({
  book,
  onFallback
}: {
  book: ARBookPayload;
  onFallback: (reason: WebXRFallbackReason) => void;
}) {
  const sessionRef = React.useRef<XRSessionLike | null>(null);
  const [isStarting, setIsStarting] = React.useState(false);
  const [status, setStatus] = React.useState(
    "Start an immersive AR session when your device camera is ready."
  );

  const handleSessionEnd = React.useCallback(() => {
    sessionRef.current = null;
    setStatus("The AR session ended. You can start it again at any time.");
  }, []);

  React.useEffect(() => {
    return () => {
      const session = sessionRef.current;

      sessionRef.current = null;
      session?.removeEventListener?.("end", handleSessionEnd);
      void session?.end?.();
    };
  }, [handleSessionEnd]);

  async function handleStart() {
    if (isStarting) {
      return;
    }

    setIsStarting(true);

    try {
      const xr = navigator.xr;

      if (
        !xr ||
        typeof xr.isSessionSupported !== "function" ||
        typeof xr.requestSession !== "function"
      ) {
        setStatus("AR session startup is unavailable on this device. Opening the fallback preview.");
        onFallback("renderer-init-failed");
        return;
      }

      const isSupported = await xr.isSessionSupported("immersive-ar");

      if (!isSupported) {
        setStatus("Immersive AR is unavailable right now. Opening the fallback preview.");
        onFallback("renderer-init-failed");
        return;
      }

      setStatus(`Starting AR session for "${book.title}"...`);

      const nextSession = (await xr.requestSession("immersive-ar")) as XRSessionLike;

      sessionRef.current?.removeEventListener?.("end", handleSessionEnd);
      void sessionRef.current?.end?.();

      sessionRef.current = nextSession;
      nextSession?.addEventListener?.("end", handleSessionEnd);

      setStatus(`AR session is active for "${book.title}".`);
    } catch {
      setStatus("Camera or AR session startup failed. Opening the fallback preview.");
      onFallback("camera-denied");
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div
      data-testid="ar-preview-webxr"
      className="overflow-hidden rounded-[32px] border border-emerald-400/20 bg-slate-950/85 shadow-[0_24px_80px_rgba(2,6,23,0.35)]"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-300">
          WebXR Preview
        </p>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-200">
          immersive-ar
        </span>
      </div>
      <div className="space-y-6 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))] px-8 py-10">
        <div className="space-y-3">
          <p className="text-base font-medium text-white">{book.title}</p>
          <p className="max-w-2xl text-sm leading-7 text-slate-300">{status}</p>
        </div>
        <button
          type="button"
          onClick={handleStart}
          disabled={isStarting}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:bg-emerald-300/60"
        >
          {isStarting ? "Starting AR..." : "Start AR"}
        </button>
      </div>
    </div>
  );
}
