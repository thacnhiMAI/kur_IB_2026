"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function setRecommendationFavorite(bookId: string, active: boolean) {
  const user = await requireUser("/recommendations");
  if (typeof bookId !== "string" || !bookId.trim() || bookId.length > 200 || typeof active !== "boolean") {
    return { ok: false as const, message: "Не удалось сохранить книгу." };
  }
  try {
    const book = await db.book.findFirst({ where: { id: bookId, isPublished: true }, select: { slug: true } });
    if (!book) return { ok: false as const, message: "Книга недоступна." };
    if (active) {
      await db.favorite.upsert({
        where: { userId_bookId: { userId: user.id, bookId } },
        create: { userId: user.id, bookId },
        update: {}
      });
    } else {
      await db.favorite.deleteMany({ where: { userId: user.id, bookId } });
    }
    revalidatePath("/favorites");
    revalidatePath("/recommendations");
    revalidatePath(`/books/${book.slug}`);
    return { ok: true as const, active };
  } catch {
    return { ok: false as const, message: "Не удалось сохранить книгу. Попробуйте ещё раз." };
  }
}
