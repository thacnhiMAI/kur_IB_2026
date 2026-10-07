"use client";

import React, { type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { OfflineStatusBanner } from "@/components/pwa/offline-status-banner";
import { DashboardSidebar } from "@/components/site/dashboard-sidebar";
import { SiteHeader } from "@/components/site/site-header";

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // The landing page intentionally keeps the exact standalone homepage design
  // supplied by the user. The authenticated/product surfaces use the dashboard
  // shell inspired by the supplied reference image.
  if (pathname === "/") {
    return (
      <>
        <OfflineStatusBanner />
        {children}
      </>
    );
  }

  return (
    <div className="dashboard-app min-h-screen">
      <OfflineStatusBanner />
      <SiteHeader />
      <div className="dashboard-layout">
        <DashboardSidebar />
        <main className="dashboard-main min-w-0">{children}</main>
      </div>
    </div>
  );
}
