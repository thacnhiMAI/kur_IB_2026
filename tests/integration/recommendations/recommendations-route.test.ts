import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findUnique, findFirst, generateRecommendationsForUser } = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  generateRecommendationsForUser: vi.fn()
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique },
    recommendationSnapshot: { findFirst }
  }
}));
vi.mock("@/lib/recommendations/service", () => ({
  generateRecommendationsForUser
}));

import { GET, POST } from "@/app/api/recommendations/route";

describe("/api/recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 from GET when the session user no longer exists", async () => {
    auth.mockResolvedValue({ user: { id: "ghost-user" } });
    findUnique.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("returns 401 from POST when the session user no longer exists", async () => {
    auth.mockResolvedValue({ user: { id: "ghost-user" } });
    findUnique.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(generateRecommendationsForUser).not.toHaveBeenCalled();
  });

  it("returns the latest snapshot when the session user exists", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    findUnique.mockResolvedValue({ id: "user-1" });
    findFirst.mockResolvedValue({ id: "snapshot-1" });

    const response = await GET();

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { id: true }
    });
    await expect(response.json()).resolves.toEqual({ id: "snapshot-1" });
  });
});
