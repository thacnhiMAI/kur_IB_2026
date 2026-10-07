import React from "react";
import { ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";

export type AuthNavUser = {
  name?: string | null;
  email?: string | null;
  role?: "USER" | "ADMIN";
  image?: string | null;
} | null;

export type AuthNavVariant = "full" | "compact";

type AuthNavProps = {
  user: AuthNavUser;
  loading?: boolean;
  variant?: AuthNavVariant;
  onSignOut: () => Promise<void>;
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]"
    >
      {children}
    </Link>
  );
}

function initials(user: NonNullable<AuthNavUser>) {
  const value = user.name?.trim() || user.email?.trim() || "U";
  const parts = value.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : value.slice(0, 2)).toUpperCase();
}

function CompactNav({ user, loading, onSignOut }: AuthNavProps) {
  if (loading) return <span className="h-11 w-11 animate-pulse rounded-full bg-white/5" />;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/auth/sign-in" className="dashboard-auth-link">Войти</Link>
        <Link href="/auth/sign-up" className="dashboard-auth-primary">Регистрация</Link>
      </div>
    );
  }

  return (
    <details className="dashboard-user-menu group relative">
      <summary className="dashboard-user-summary" aria-label="Меню профиля">
        <span className="dashboard-user-avatar">
          {user.image ? <img src={user.image} alt="" className="h-full w-full rounded-full object-cover" /> : initials(user)}
        </span>
        <ChevronDown size={16} className="transition group-open:rotate-180" />
      </summary>
      <div className="dashboard-user-popover">
        <div className="border-b border-[var(--surface-border)] px-3 pb-3 pt-1">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{user.name || "Читатель"}</p>
          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">{user.email}</p>
        </div>
        {user.role === "ADMIN" ? (
          <Link href="/admin" className="dashboard-user-menu-link"><ShieldCheck size={16} />Админ</Link>
        ) : null}
        <button type="button" onClick={() => void onSignOut()} className="dashboard-user-menu-link w-full">
          <LogOut size={16} />Выйти
        </button>
      </div>
    </details>
  );
}

export function AuthNav({ user, loading = false, variant = "full", onSignOut }: AuthNavProps) {
  if (variant === "compact") return <CompactNav user={user} loading={loading} variant={variant} onSignOut={onSignOut} />;

  if (loading) {
    return (
      <div className="flex items-center gap-2" aria-label="Загрузка навигации">
        <span className="h-9 w-20 animate-pulse rounded-full bg-white/5" />
        <span className="h-9 w-24 animate-pulse rounded-full bg-white/5" />
        <span className="h-9 w-16 animate-pulse rounded-full bg-white/5" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1">
        <NavLink href="/catalog">Каталог</NavLink>
        <NavLink href="/recommendations">Рекомендации</NavLink>
        <Link href="/auth/sign-in" className="concept-button-secondary ml-1 rounded-full px-4 py-2 text-sm font-semibold">Войти</Link>
        <Link href="/auth/sign-up" className="concept-button-primary rounded-full px-4 py-2 text-sm font-semibold">Регистрация</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <NavLink href="/catalog">Каталог</NavLink>
      <NavLink href="/recommendations">Рекомендации</NavLink>
      <NavLink href="/favorites">Избранное</NavLink>
      <NavLink href="/profile">Профиль</NavLink>
      {user.role === "ADMIN" ? <NavLink href="/admin">Админ</NavLink> : null}
      <button
        type="button"
        onClick={() => void onSignOut()}
        className="ml-1 rounded-full border border-[var(--surface-border-strong)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[rgb(var(--accent-rgb)/0.45)] hover:text-[var(--accent-text)]"
      >
        Выйти
      </button>
    </div>
  );
}
