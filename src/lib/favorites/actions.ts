import { auth } from "@/auth";
import { db } from "@/lib/db";

export function buildFavoriteKey(userId: string, bookId: string) {
  return `${userId}:${bookId}`;
}

export async function toggleFavorite(bookId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const existing = await db.favorite.findUnique({
    where: {
      userId_bookId: {
        userId: session.user.id,
        bookId
      }
    }
  });

  if (existing) {
    await db.favorite.delete({
      where: { id: existing.id }
    });

    return { active: false };
  }

  await db.favorite.create({
    data: {
      userId: session.user.id,
      bookId
    }
  });

  return { active: true };
}
