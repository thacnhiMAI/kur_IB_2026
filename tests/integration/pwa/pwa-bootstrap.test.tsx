import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OfflineStatusBanner } from "@/components/pwa/offline-status-banner";
import { PwaBootstrap } from "@/components/pwa/pwa-bootstrap";

describe("PwaBootstrap", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("unregisters service workers and clears caches outside production", async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([{ unregister }]);
    const keys = vi.fn().mockResolvedValue(["smart-library-shell-v1", "other-cache"]);
    const del = vi.fn().mockResolvedValue(true);

    Object.defineProperty(window.navigator, "serviceWorker", {
      value: { getRegistrations },
      configurable: true
    });

    Object.defineProperty(window, "caches", {
      value: {
        keys,
        delete: del
      },
      configurable: true
    });

    render(<PwaBootstrap />);

    await waitFor(() => {
      expect(getRegistrations).toHaveBeenCalled();
      expect(unregister).toHaveBeenCalled();
      expect(keys).toHaveBeenCalled();
      expect(del).toHaveBeenCalledWith("smart-library-shell-v1");
    });
  });

  it("registers the service worker in production", async () => {
    const register = vi.fn().mockResolvedValue({});
    const getRegistrations = vi.fn().mockResolvedValue([]);

    vi.stubEnv("NODE_ENV", "production");

    Object.defineProperty(window.navigator, "serviceWorker", {
      value: { register, getRegistrations },
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
