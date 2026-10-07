import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";

async function viewerId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await viewerId();
  if (!userId) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        href: true,
        readAt: true,
        createdAt: true
      }
    }),
    db.notification.count({ where: { userId, readAt: null } })
  ]);

  return NextResponse.json({
    ok: true,
    authenticated: true,
    unreadCount,
    notifications: notifications.map((item) => ({
      ...item,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString()
    }))
  });
}

export async function POST(request: Request) {
  const userId = await viewerId();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await request.json().catch(() => null) as { id?: string; markAll?: boolean } | null;
  const now = new Date();

  if (body?.markAll) {
    await db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: now }
    });
    return NextResponse.json({ ok: true });
  }

  if (!body?.id) return NextResponse.json({ ok: false }, { status: 400 });

  const result = await db.notification.updateMany({
    where: { id: body.id, userId },
    data: { readAt: now }
  });

  return NextResponse.json({ ok: result.count > 0 });
}
