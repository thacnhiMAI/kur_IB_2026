import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { generateRecommendationsForUser } from "@/lib/recommendations/service";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await db.recommendationSnapshot.findFirst({
    where: { userId: session.user.id },
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
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await generateRecommendationsForUser(session.user.id);
  return NextResponse.json(snapshot);
}
