"use client";

import { Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useState, useTransition } from "react";

export function CredentialsSignInForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Введите корректный email.");
      return;
    }

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (!result || result.error) {
        setError("Неверный email или пароль, аккаунт не подтверждён или доступ ограничен.");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-[var(--text-secondary)]">Email</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@gmail.com"
          className="concept-input rounded-2xl px-4 py-3.5"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-[var(--text-secondary)]">Пароль</span>
        <span className="relative block">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••••"
            className="concept-input rounded-2xl px-4 py-3.5 pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            className="absolute inset-y-0 right-2 my-auto grid h-9 w-9 place-items-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </label>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-200">
          {error}
        </div>
      ) : null}

      <button
        disabled={pending}
        className="concept-button-primary w-full rounded-2xl px-5 py-3.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Входим..." : "Войти по email"}
      </button>
    </form>
  );
}
