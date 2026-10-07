import "./globals.css";
import "./homepage-black-blue.css";
import "katex/dist/katex.min.css";
import React from "react";
import type { ReactNode } from "react";

import { PwaBootstrap } from "@/components/pwa/pwa-bootstrap";
import { PreferencesController } from "@/components/preferences/preferences-controller";
import { AppFrame } from "@/components/site/app-frame";
import { buildRootMetadata } from "@/lib/site/metadata";

export const metadata = buildRootMetadata();

const OFFLINE_BANNER_SCRIPT = `
(() => {
  const bannerId = "offline-status-banner";
  const updateBanner = () => {
    const banner = document.getElementById(bannerId);
    if (!banner) return;
    banner.hidden = navigator.onLine !== false;
  };
  window.addEventListener("online", updateBanner);
  window.addEventListener("offline", updateBanner);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateBanner, { once: true });
  } else {
    updateBanner();
  }
})();
`;

const APPEARANCE_BOOTSTRAP_SCRIPT = `
(() => {
  try {
    const raw = localStorage.getItem("smart-library:settings:v1");
    const settings = raw ? JSON.parse(raw) : {};
    const root = document.documentElement;
    const preference = ["system", "dark", "light", "contrast"].includes(settings.theme)
      ? settings.theme
      : "system";
    const resolvedTheme = preference === "system"
      ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : preference;
    root.dataset.theme = resolvedTheme;
    root.dataset.themePreference = preference;
    root.dataset.accent = ["cyan", "violet", "emerald", "amber", "rose"].includes(settings.accent)
      ? settings.accent
      : "cyan";
    root.dataset.density = settings.density === "compact" ? "compact" : "comfortable";
    root.dataset.motion = ["system", "reduced", "full"].includes(settings.motion)
      ? settings.motion
      : "system";
    const scale = [1, 1.1, 1.2].includes(Number(settings.textScale)) ? Number(settings.textScale) : 1;
    root.style.setProperty("--app-text-scale", String(scale));
  } catch {
    document.documentElement.dataset.theme = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    document.documentElement.dataset.accent = "cyan";
  }
})();
`;

export default function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOTSTRAP_SCRIPT }} />
        <PwaBootstrap />
        <PreferencesController />
        <script dangerouslySetInnerHTML={{ __html: OFFLINE_BANNER_SCRIPT }} />
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
