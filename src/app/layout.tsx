import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

import { AuthNavClient } from "@/components/auth/auth-nav-client";
import { OfflineStatusBanner } from "@/components/pwa/offline-status-banner";
import { PwaBootstrap } from "@/components/pwa/pwa-bootstrap";
import { buildRootMetadata } from "@/lib/site/metadata";

export const metadata = buildRootMetadata();

const OFFLINE_BANNER_SCRIPT = `
(() => {
  const bannerId = "offline-status-banner";

  const updateBanner = () => {
    const banner = document.getElementById(bannerId);

    if (!banner) {
      return;
    }

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

export default function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        <PwaBootstrap />
        <script dangerouslySetInnerHTML={{ __html: OFFLINE_BANNER_SCRIPT }} />
        <OfflineStatusBanner />
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-xl font-semibold tracking-tight">
              Умная библиотека
            </Link>
            <AuthNavClient />
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
