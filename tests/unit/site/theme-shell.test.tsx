import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/auth/auth-nav-client", () => ({
  AuthNavClient: () => <div>Auth Nav</div>
}));

vi.mock("@/components/pwa/pwa-bootstrap", () => ({
  PwaBootstrap: () => null
}));

vi.mock("@/components/pwa/offline-status-banner", () => ({
  OfflineStatusBanner: () => <div>Offline Banner</div>
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/catalog", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import RootLayout from "@/app/layout";

describe("RootLayout", () => {
  it("renders the editorial app frame and branded header shell", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(
      RootLayout({
        children: <div>Page body</div>
      })
    );

    expect(screen.getByRole("link", { name: "Умная библиотека — главная" })).toBeInTheDocument();
    expect(screen.getByTestId("site-header")).toBeInTheDocument();
    expect(screen.getByText("Page body")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
