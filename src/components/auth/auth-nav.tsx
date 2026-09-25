import React from "react";
import Link from "next/link";

export type AuthNavUser = {
  name?: string | null;
  email?: string | null;
  role?: "USER" | "ADMIN";
} | null;

type AuthNavProps = {
  user: AuthNavUser;
  onSignOut: () => Promise<void>;
};

function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

export function AuthNav({ user, onSignOut }: AuthNavProps) {
  if (!user) {
    return (
      <div className="flex items-center gap-3 text-sm text-slate-200">
        <Link href="/catalog" className="transition hover:text-cyan-300">
          Каталог
        </Link>
        <Link href="/recommendations" className="transition hover:text-cyan-300">
          Рекомендации
        </Link>
        <Link href="/auth/sign-in" className="transition hover:text-cyan-300">
          Вход
        </Link>
        <Link
          href="/auth/sign-up"
          aria-label="Регистрация через Google"
          title="Регистрация через Google"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400 font-medium text-slate-950 transition hover:bg-cyan-300"
        >
          <MailIcon />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm text-slate-200">
      <Link href="/catalog" className="transition hover:text-cyan-300">
        Каталог
      </Link>
      <Link href="/recommendations" className="transition hover:text-cyan-300">
        Рекомендации
      </Link>
      <Link href="/favorites" className="transition hover:text-cyan-300">
          Избранное
      </Link>
      <Link href="/profile" className="transition hover:text-cyan-300">
          {user.name ?? user.email ?? "Профиль"}
      </Link>
      {user.role === "ADMIN" ? (
        <Link href="/admin/books" className="transition hover:text-cyan-300">
          Admin
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => {
          void onSignOut();
        }}
        className="rounded-lg border border-slate-700 px-3 py-2 font-medium transition hover:border-cyan-300 hover:text-cyan-200"
      >
        Выйти
      </button>
    </div>
  );
}
