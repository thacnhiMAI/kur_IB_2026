import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getVapidConfig, isSupportedPushEndpoint } from "@/lib/pwa/push";

const endpointSchema = z.string().max(2048).refine(isSupportedPushEndpoint);
const subscriptionSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/)
  })
});

export async function POST(request: Request) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getVapidConfig()) return NextResponse.json({ error: "Push unavailable" }, { status: 503 });
  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, userId, ...keys },
    update: { userId, ...keys }
  });
  return new Response(null, { status: 204 });
}

export async function DELETE(request: Request) {
  const userId = (await auth())?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ endpoint: endpointSchema }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  await db.pushSubscription.deleteMany({ where: { userId, endpoint: parsed.data.endpoint } });
  return new Response(null, { status: 204 });
}
