import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OfflineStatusBanner } from "@/components/pwa/offline-status-banner";
import { PwaBootstrap } from "@/components/pwa/pwa-bootstrap";

describe("PwaBootstrap", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers the service worker", async () => {
    const register = vi.fn().mockResolvedValue({});

    Object.defineProperty(window.navigator, "serviceWorker", {
      value: { register },
      configurable: true
    });

    render(<PwaBootstrap />);

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith("/sw.js");
    });
  });

  it("renders the offline banner copy when offline state is active", () => {
    render(<OfflineStatusBanner isOffline />);

    expect(
      screen.getByText("Вы сейчас офлайн. Доступны сохранённые страницы.")
    ).toBeInTheDocument();
  });
});
