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

import RootLayout from "@/app/layout";

describe("RootLayout", () => {
  it("renders the editorial app frame and branded header shell", () => {
    render(
      RootLayout({
        children: <div>Page body</div>
      })
    );

    expect(screen.getByTestId("site-shell")).toBeInTheDocument();
    expect(screen.getByTestId("site-header")).toBeInTheDocument();
    expect(screen.getByText("Умная библиотека")).toBeInTheDocument();
    expect(screen.getByText("Page body")).toBeInTheDocument();
  });
});
