import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, signOut } = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn()
}));

vi.mock("next-auth/react", () => ({
  getSession,
  signOut
}));

import { AuthNavClient } from "@/components/auth/auth-nav-client";

describe("AuthNavClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders signed-out links before session hydration", () => {
    getSession.mockResolvedValue(null);

    render(<AuthNavClient />);

    expect(screen.getByRole("link", { name: "Gmail sign up" })).toBeInTheDocument();
  });

  it("hydrates to the signed-in nav when a session exists", async () => {
    getSession.mockResolvedValue({
      user: {
        name: "Reader",
        email: "reader@example.com",
        role: "USER"
      }
    });

    render(<AuthNavClient />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Reader" })).toBeInTheDocument();
    });
  });
});
