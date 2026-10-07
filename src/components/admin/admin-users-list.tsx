"use client";

import { useMemo, useState } from "react";

import {
  banAdminUser,
  deleteAdminUser,
  revokeAdminUserAccess,
  setAdminUserEmailVerified,
  setAdminUserRole,
  unbanAdminUser
} from "@/app/admin/users/actions";
import { DeleteSubmitButton } from "@/components/admin/delete-submit-button";

type AdminUserItem = {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  emailVerified: string | null;
  bannedPermanently: boolean;
  bannedUntil: string | null;
  banReason: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  providers: string[];
  favoritesCount: number;
  reviewsCount: number;
  progressCount: number;
};

function statusLabel(user: AdminUserItem) {
  if (user.bannedPermanently) return "Заблокирован навсегда";
  if (user.bannedUntil && new Date(user.bannedUntil).getTime() > Date.now()) {
    return `Заблокирован до ${new Date(user.bannedUntil).toLocaleDateString("ru-RU")}`;
  }
  return "Активен";
}

export function AdminUsersList({ users, currentAdminId }: { users: AdminUserItem[]; currentAdminId: string }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      const blocked = user.bannedPermanently || Boolean(user.bannedUntil && new Date(user.bannedUntil).getTime() > Date.now());
      const matchesQuery = !needle || `${user.name ?? ""} ${user.email} ${user.providers.join(" ")}`.toLowerCase().includes(needle);
      const matchesRole = role === "ALL" || user.role === role;
      const matchesStatus = status === "ALL" || (status === "BANNED" ? blocked : !blocked);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, role, status, users]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по имени, email или провайдеру..." className="concept-input rounded-2xl px-4 py-3" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="concept-input rounded-2xl px-4 py-3">
          <option value="ALL">Все роли</option><option value="USER">USER</option><option value="ADMIN">ADMIN</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="concept-input rounded-2xl px-4 py-3">
          <option value="ALL">Все статусы</option><option value="ACTIVE">Активные</option><option value="BANNED">Заблокированные</option>
        </select>
      </div>

      <div className="space-y-4">
        {filtered.map((user) => {
          const isSelf = user.id === currentAdminId;
          const blocked = user.bannedPermanently || Boolean(user.bannedUntil && new Date(user.bannedUntil).getTime() > Date.now());
          return (
            <article key={user.id} className="editorial-surface rounded-[26px] p-5 sm:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl text-[var(--text-primary)]">{user.name || "Без имени"}</h2>
                    <span className="rounded-full border border-[var(--surface-border)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">{user.role}</span>
                    {isSelf ? <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs text-blue-200">Вы</span> : null}
                  </div>
                  <p className="break-all text-sm text-[var(--text-secondary)]">{user.email}</p>
                  <p className={`text-sm ${blocked ? "text-rose-300" : "text-emerald-300"}`}>{statusLabel(user)}</p>
                  {user.banReason ? <p className="text-sm text-[var(--text-muted)]">Причина: {user.banReason}</p> : null}
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--text-muted)]">
                    <span>Email: {user.emailVerified ? "подтверждён" : "не подтверждён"}</span>
                    <span>Провайдеры: {user.providers.join(", ") || "credentials"}</span>
                    <span>Избранное: {user.favoritesCount}</span>
                    <span>Отзывы: {user.reviewsCount}</span>
                    <span>Прогресс: {user.progressCount}</span>
                    <span>Регистрация: {new Date(user.createdAt).toLocaleDateString("ru-RU")}</span>
                    <span>Последний вход: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("ru-RU") : "—"}</span>
                  </div>
                </div>

                <div className="grid w-full gap-3 xl:max-w-[620px] xl:grid-cols-2">
                  <form action={setAdminUserRole.bind(null, user.id)} className="flex gap-2">
                    <select name="role" defaultValue={user.role} disabled={isSelf} className="concept-input min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm">
                      <option value="USER">USER</option><option value="ADMIN">ADMIN</option>
                    </select>
                    <button disabled={isSelf} className="editorial-button-secondary rounded-xl px-3 py-2 text-xs disabled:opacity-40">Роль</button>
                  </form>

                  <form action={banAdminUser.bind(null, user.id)} className="grid grid-cols-[120px_1fr_auto] gap-2">
                    <select name="duration" disabled={isSelf} className="concept-input rounded-xl px-2 py-2 text-xs">
                      <option value="1">1 день</option><option value="7">7 дней</option><option value="30">30 дней</option><option value="365">1 год</option><option value="permanent">Навсегда</option>
                    </select>
                    <input name="reason" disabled={isSelf} placeholder="Причина" className="concept-input min-w-0 rounded-xl px-3 py-2 text-xs" />
                    <button disabled={isSelf} className="rounded-xl border border-rose-500/35 px-3 py-2 text-xs text-rose-200 disabled:opacity-40">Ban</button>
                  </form>

                  <div className="flex flex-wrap gap-2">
                    {blocked ? (
                      <form action={unbanAdminUser.bind(null, user.id)}><button disabled={isSelf} className="editorial-button-secondary rounded-xl px-3 py-2 text-xs disabled:opacity-40">Разблокировать</button></form>
                    ) : null}
                    <form action={revokeAdminUserAccess.bind(null, user.id)}><button disabled={isSelf} className="editorial-button-secondary rounded-xl px-3 py-2 text-xs disabled:opacity-40">Завершить сессии</button></form>
                    <form action={setAdminUserEmailVerified.bind(null, user.id, !Boolean(user.emailVerified))}>
                      <button disabled={isSelf} className="editorial-button-secondary rounded-xl px-3 py-2 text-xs disabled:opacity-40">{user.emailVerified ? "Снять verify" : "Verify email"}</button>
                    </form>
                  </div>

                  <form action={deleteAdminUser.bind(null, user.id)} className="flex justify-end">
                    <DeleteSubmitButton idleLabel="Удалить аккаунт" pendingLabel="Удаляем..." confirmMessage={`Удалить аккаунт ${user.email} и связанные данные?`} disabled={isSelf} />
                  </form>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
