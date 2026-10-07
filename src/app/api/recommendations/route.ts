import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { generateRecommendationsForUser } from "@/lib/recommendations/service";

async function getSessionUserId() {
  const sessionUserId = (await auth())?.user?.id;

  if (!sessionUserId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: sessionUserId },
    select: { id: true }
  });

  return user?.id ?? null;
}

export async function GET() {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await db.recommendationSnapshot.findFirst({
    where: { userId },
    include: {
      items: {
        include: { book: true },
        orderBy: { position: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(snapshot);
}

export async function POST() {
  const userId = await getSessionUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await generateRecommendationsForUser(userId);
  return NextResponse.json(snapshot);
}
