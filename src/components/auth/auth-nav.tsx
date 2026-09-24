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
          Đăng nhập
        </Link>
        <Link
          href="/auth/sign-up"
          className="rounded-lg bg-cyan-400 px-3 py-2 font-medium text-slate-950"
        >
          Gmail sign up
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
        Yêu thích
      </Link>
      <Link href="/profile" className="transition hover:text-cyan-300">
        {user.name ?? user.email ?? "Hồ sơ"}
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
        Đăng xuất
      </button>
    </div>
  );
}
