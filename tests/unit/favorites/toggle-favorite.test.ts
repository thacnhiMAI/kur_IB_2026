import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUser, toggleFavorite, refreshRecommendationSnapshotForUser, revalidatePath } =
  vi.hoisted(() => ({
    requireUser: vi.fn(),
    toggleFavorite: vi.fn(),
    refreshRecommendationSnapshotForUser: vi.fn(),
    revalidatePath: vi.fn()
  }));

vi.mock("next/cache", () => ({
  revalidatePath
}));

vi.mock("@/auth", () => ({
  auth: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  db: {}
}));

vi.mock("@/lib/auth", () => ({
  requireUser
}));

vi.mock("@/lib/favorites/actions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/favorites/actions")>(
    "@/lib/favorites/actions"
  );

  return {
    ...actual,
    toggleFavorite
  };
});

vi.mock("@/lib/recommendations/refresh", () => ({
  refreshRecommendationSnapshotForUser
}));

import { toggleFavoriteForBook } from "@/lib/books/actions";
import { buildFavoriteKey } from "@/lib/favorites/actions";

describe("buildFavoriteKey", () => {
  it("returns a stable composite key", () => {
    expect(buildFavoriteKey("user-1", "book-1")).toBe("user-1:book-1");
  });
});

describe("toggleFavoriteForBook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({
      id: "user-1",
      name: "Reader",
      email: "reader@example.com",
      role: "USER"
    });
    toggleFavorite.mockResolvedValue({ active: true });
    refreshRecommendationSnapshotForUser.mockResolvedValue({ id: "snapshot-1" });
  });

  it("refreshes recommendation snapshot after the favorite signal is saved", async () => {
    const formData = new FormData();
    formData.set("bookId", "book-1");
    formData.set("slug", "design-of-everyday-things");

    await toggleFavoriteForBook(formData);

    expect(toggleFavorite).toHaveBeenCalledWith("book-1");
    expect(refreshRecommendationSnapshotForUser).toHaveBeenCalledWith("user-1", "favorite");
    expect(toggleFavorite.mock.invocationCallOrder[0]).toBeLessThan(
      refreshRecommendationSnapshotForUser.mock.invocationCallOrder[0]
    );
    expect(revalidatePath).toHaveBeenCalledWith("/favorites");
    expect(revalidatePath).toHaveBeenCalledWith("/recommendations");
    expect(revalidatePath).toHaveBeenCalledWith("/books/design-of-everyday-things");
  });
});
