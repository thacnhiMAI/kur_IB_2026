import React from "react";
import type { ReactNode } from "react";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="site-shell"
      className="site-frame min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]"
    >
      <div className="site-frame__inner mx-auto max-w-[1440px] px-4 pb-14 pt-6 sm:px-6 lg:px-10">
        {children}
      </div>
    </div>
  );
}
