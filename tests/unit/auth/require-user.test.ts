import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, redirect, findUnique } = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((target: string) => {
    throw new Error(`REDIRECT:${target}`);
  }),
  findUnique: vi.fn()
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique
    }
  }
}));

import { requireUser } from "@/lib/auth";

describe("requireUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to sign-in when there is no session", async () => {
    auth.mockResolvedValue(null);

    await expect(requireUser()).rejects.toThrow("REDIRECT:/auth/sign-in");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("preserves the callback url when redirecting anonymous users", async () => {
    auth.mockResolvedValue(null);

    await expect(requireUser("/favorites")).rejects.toThrow(
      "REDIRECT:/auth/sign-in?callbackUrl=%2Ffavorites"
    );
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("redirects to sign-in when the session user no longer exists", async () => {
    auth.mockResolvedValue({ user: { id: "ghost-user", role: "USER" } });
    findUnique.mockResolvedValue(null);

    await expect(requireUser()).rejects.toThrow("REDIRECT:/auth/sign-in");
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "ghost-user" },
      select: { id: true, email: true, image: true, name: true, role: true }
    });
  });

  it("returns the persisted user when the session is valid", async () => {
    auth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    findUnique.mockResolvedValue({
      id: "user-1",
      email: "reader@example.com",
      image: null,
      name: "Reader",
      role: "USER"
    });

    await expect(requireUser()).resolves.toEqual({
      id: "user-1",
      email: "reader@example.com",
      image: null,
      name: "Reader",
      role: "USER"
    });
  });
});
