import { db } from "@/lib/db";

export type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
};

export async function createNotification(input: NotificationInput) {
  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null
    }
  });
}

export async function notifyAdmins(input: Omit<NotificationInput, "userId"> & { excludeUserId?: string }) {
  const admins = await db.user.findMany({
    where: {
      role: "ADMIN",
      ...(input.excludeUserId ? { id: { not: input.excludeUserId } } : {})
    },
    select: { id: true }
  });

  if (admins.length === 0) return;

  await db.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null
    }))
  });
}
