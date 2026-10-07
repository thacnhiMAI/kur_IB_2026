import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { AdminUsersList } from "@/components/admin/admin-users-list";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireAdmin("/admin/users");
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      accounts: { select: { provider: true } },
      _count: { select: { favorites: true, reviews: true, readingProgress: true } }
    }
  });

  const items = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified?.toISOString() ?? null,
    bannedPermanently: user.bannedPermanently,
    bannedUntil: user.bannedUntil?.toISOString() ?? null,
    banReason: user.banReason,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    providers: user.accounts.map((account) => account.provider),
    favoritesCount: user._count.favorites,
    reviewsCount: user._count.reviews,
    progressCount: user._count.readingProgress
  }));

  return (
    <section className="space-y-7">
      <AdminSectionNav current="users" />
      <div><p className="concept-kicker">ADMIN · ACCESS CONTROL</p><h1 className="mt-3 text-4xl text-[var(--text-primary)]">Пользователи</h1><p className="mt-3 max-w-3xl text-[var(--text-secondary)]">Роли, блокировки, подтверждение email, отзыв сессий и удаление аккаунтов. Действия администратора записываются в audit log.</p></div>
      <AdminUsersList users={items} currentAdminId={admin.id} />
    </section>
  );
}
