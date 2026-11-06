import { after } from "next/server";
import webPush from "web-push";

import { db } from "@/lib/db";

export function getVapidConfig() {
  const { VAPID_SUBJECT: subject, VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey } = process.env;
  return subject && publicKey && privateKey ? { subject, publicKey, privateKey } : null;
}

export function isSupportedPushEndpoint(endpoint: string) {
  const url = URL.canParse(endpoint) ? new URL(endpoint) : null;
  if (!url || url.protocol !== "https:" || url.port || url.username || url.password || url.hash) return false;
  return [
    "fcm.googleapis.com", "push.services.mozilla.com", "push.apple.com", "notify.windows.com"
  ].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

export async function deliverPublicationPushes() {
  const vapidDetails = getVapidConfig();
  if (!vapidDetails) return;
  const now = new Date();
  const expiresBefore = new Date(now.getTime() - 7 * 86_400_000);
  await db.bookPublicationPush.deleteMany({ where: { publishedAt: { lt: expiresBefore } } });
  for (let batch = 0; batch < 12; batch++) {
    if (Date.now() - now.getTime() > 35_000) break;
    const event = await db.bookPublicationPush.findFirst({
      where: { availableAt: { lte: new Date() }, book: { isPublished: true } },
      orderBy: [{ availableAt: "asc" }, { publishedAt: "asc" }],
      include: { book: { select: { title: true, slug: true } } }
    });
    if (!event) break;
    const leaseUntil = new Date(Date.now() + 60_000);
    const key = { bookId: event.bookId, publishedAt: event.publishedAt };
    const claim = await db.bookPublicationPush.updateMany({
      where: { ...key, availableAt: event.availableAt },
      data: { availableAt: leaseUntil }
    });
    if (!claim.count) continue;
    const claimedEvent = { ...key, availableAt: leaseUntil };
    const devices = await db.pushSubscription.findMany({
      where: {
        id: { gt: event.lastDeviceId },
        createdAt: { lte: event.publishedAt },
        user: { bannedPermanently: false, OR: [{ bannedUntil: null }, { bannedUntil: { lte: now } }] }
      },
      orderBy: { id: "asc" },
      take: 20
    });
    const message = JSON.stringify({
      title: "Новинка в библиотеке",
      body: event.book.title.slice(0, 180),
      href: `/books/${encodeURIComponent(event.book.slug)}`,
      tag: `book-${event.bookId}`
    });
    const results = await Promise.allSettled(devices.map(async ({ id, endpoint, p256dh, auth }) => {
      if (!isSupportedPushEndpoint(endpoint)) return;
      try {
        await webPush.sendNotification({ endpoint, keys: { p256dh, auth } }, message, {
          vapidDetails, TTL: 86_400, timeout: 7_000
        });
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status !== 404 && status !== 410) throw error;
        await db.pushSubscription.deleteMany({ where: { id, endpoint, p256dh, auth } });
      }
    }));
    const firstFailure = results.findIndex((result) => result.status === "rejected");
    if (firstFailure === -1 && devices.length < 20) {
      await db.bookPublicationPush.deleteMany({ where: claimedEvent });
    } else {
      const advanced = firstFailure === -1 ? devices.length : firstFailure;
      await db.bookPublicationPush.updateMany({
        where: claimedEvent,
        data: {
          lastDeviceId: devices[advanced - 1]?.id ?? event.lastDeviceId,
          availableAt: new Date(Date.now() + (firstFailure === -1 ? 0 : 15 * 60_000))
        }
      });
    }
  }
}

export function schedulePublicationPushes() {
  if (getVapidConfig()) after(() => deliverPublicationPushes().catch(() => {
    console.error("Publication Web Push delivery failed and will be retried.");
  }));
}
