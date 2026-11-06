import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { db, sendNotification } = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  db: {
    bookPublicationPush: { findFirst: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    pushSubscription: { findMany: vi.fn(), deleteMany: vi.fn() }
  }
}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("web-push", () => ({ default: { sendNotification } }));

import { deliverPublicationPushes, isSupportedPushEndpoint } from "@/lib/pwa/push";

const event = {
  bookId: "book-1", publishedAt: new Date(), availableAt: new Date(), lastDeviceId: 0,
  book: { title: "A new book", slug: "a-new-book" }
};
const endpoint = "https://fcm.googleapis.com/fcm/send/example";

describe("publication Web Push", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("VAPID_SUBJECT", "mailto:admin@example.com");
    vi.stubEnv("VAPID_PUBLIC_KEY", "test-public");
    vi.stubEnv("VAPID_PRIVATE_KEY", "test-private");
    db.bookPublicationPush.findFirst.mockResolvedValueOnce(event).mockResolvedValue(null);
    db.bookPublicationPush.updateMany.mockResolvedValue({ count: 1 });
    db.pushSubscription.findMany.mockResolvedValue([{ id: 1, endpoint, p256dh: "key", auth: "auth" }]);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sends a book deep link and removes endpoints that have expired", async () => {
    sendNotification.mockRejectedValue({ statusCode: 410 });
    await deliverPublicationPushes();
    expect(JSON.parse(sendNotification.mock.calls[0][1])).toMatchObject({
      href: "/books/a-new-book", body: "A new book", tag: "book-book-1"
    });
    expect(db.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { id: 1, endpoint, p256dh: "key", auth: "auth" } });
    expect(db.bookPublicationPush.deleteMany).toHaveBeenCalledWith({ where: expect.objectContaining({ bookId: event.bookId }) });
  });

  it("defers delivery on temporary failure and does not delete the subscription", async () => {
    sendNotification.mockRejectedValue({ statusCode: 503 });
    await deliverPublicationPushes();
    expect(db.pushSubscription.deleteMany).not.toHaveBeenCalled();
    expect(db.bookPublicationPush.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      data: { lastDeviceId: 0, availableAt: expect.any(Date) }
    }));
  });

  it("only accepts secure URLs at supported push services", () => {
    expect(isSupportedPushEndpoint(endpoint)).toBe(true);
    expect(isSupportedPushEndpoint("https://web.push.apple.com/example")).toBe(true);
    expect(isSupportedPushEndpoint("https://push.apple.com.attacker.test/example")).toBe(false);
    expect(isSupportedPushEndpoint("https://127.0.0.1/example")).toBe(false);
    expect(isSupportedPushEndpoint("http://fcm.googleapis.com/example")).toBe(false);
  });
});
