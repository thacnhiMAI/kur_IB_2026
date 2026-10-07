"use server";

import { revalidatePath } from "next/cache";

import { logAdminAction } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications/service";

async function assertManageable(adminId: string, userId: string) {
  if (adminId === userId) {
    throw new Error("Нельзя выполнить это действие со своим администраторским аккаунтом.");
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Пользователь не найден.");
  return user;
}

export async function setAdminUserRole(userId: string, formData: FormData) {
  const admin = await requireAdmin("/admin/users");
  await assertManageable(admin.id, userId);
  const role = String(formData.get("role")) === "ADMIN" ? "ADMIN" : "USER";

  await db.user.update({
    where: { id: userId },
    data: { role, authVersion: { increment: 1 } }
  });
  await createNotification({ userId, type: "ACCOUNT_ROLE_CHANGED", title: "Права доступа изменены", body: role === "ADMIN" ? "Вам предоставлены права администратора." : "Ваша роль изменена на читателя.", href: "/profile" });
  await logAdminAction({ adminUserId: admin.id, action: "USER_ROLE_CHANGED", targetType: "USER", targetId: userId, metadata: { role } });
  revalidatePath("/admin/users");
}

export async function banAdminUser(userId: string, formData: FormData) {
  const admin = await requireAdmin("/admin/users");
  await assertManageable(admin.id, userId);
  const mode = String(formData.get("duration") ?? "7");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500) || null;
  const permanent = mode === "permanent";
  const days = Math.min(3650, Math.max(1, Number(mode) || 7));
  const bannedUntil = permanent ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        bannedPermanently: permanent,
        bannedUntil,
        banReason: reason,
        authVersion: { increment: 1 }
      }
    }),
    db.session.deleteMany({ where: { userId } })
  ]);

  await logAdminAction({
    adminUserId: admin.id,
    action: permanent ? "USER_BANNED_PERMANENTLY" : "USER_BANNED_UNTIL",
    targetType: "USER",
    targetId: userId,
    metadata: { reason, bannedUntil: bannedUntil?.toISOString() ?? null }
  });
  revalidatePath("/admin/users");
}

export async function unbanAdminUser(userId: string) {
  const admin = await requireAdmin("/admin/users");
  await assertManageable(admin.id, userId);
  await db.user.update({
    where: { id: userId },
    data: {
      bannedPermanently: false,
      bannedUntil: null,
      banReason: null,
      authVersion: { increment: 1 }
    }
  });
  await createNotification({ userId, type: "ACCOUNT_UNBANNED", title: "Доступ восстановлен", body: "Блокировка аккаунта снята администратором.", href: "/profile" });
  await logAdminAction({ adminUserId: admin.id, action: "USER_UNBANNED", targetType: "USER", targetId: userId });
  revalidatePath("/admin/users");
}

export async function revokeAdminUserAccess(userId: string) {
  const admin = await requireAdmin("/admin/users");
  await assertManageable(admin.id, userId);
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { authVersion: { increment: 1 } } }),
    db.session.deleteMany({ where: { userId } })
  ]);
  await logAdminAction({ adminUserId: admin.id, action: "USER_SESSIONS_REVOKED", targetType: "USER", targetId: userId });
  revalidatePath("/admin/users");
}

export async function setAdminUserEmailVerified(userId: string, verified: boolean) {
  const admin = await requireAdmin("/admin/users");
  await assertManageable(admin.id, userId);
  await db.user.update({
    where: { id: userId },
    data: {
      emailVerified: verified ? new Date() : null,
      authVersion: { increment: 1 }
    }
  });
  await createNotification({ userId, type: "ACCOUNT_EMAIL_STATUS", title: "Статус email изменён", body: verified ? "Администратор подтвердил ваш email." : "Администратор снял подтверждение email.", href: "/profile" });
  await logAdminAction({ adminUserId: admin.id, action: verified ? "USER_EMAIL_VERIFIED" : "USER_EMAIL_UNVERIFIED", targetType: "USER", targetId: userId });
  revalidatePath("/admin/users");
}

export async function deleteAdminUser(userId: string) {
  const admin = await requireAdmin("/admin/users");
  const user = await assertManageable(admin.id, userId);
  await logAdminAction({ adminUserId: admin.id, action: "USER_DELETED", targetType: "USER", targetId: userId, metadata: { email: user.email } });
  await db.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}
