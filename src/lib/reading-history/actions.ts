import { auth } from "@/auth";
import { db } from "@/lib/db";

export function normalizeReadingEvent(input: "view" | "interest" | "finished") {
  const map = {
    view: "VIEWED",
    interest: "INTERESTED",
    finished: "FINISHED"
  } as const;

  return map[input];
}

export async function recordReadingEvent(
  bookId: string,
  input: "view" | "interest" | "finished"
) {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return db.readingHistory.create({
    data: {
      userId: session.user.id,
      bookId,
      eventType: normalizeReadingEvent(input)
    }
  });
}
