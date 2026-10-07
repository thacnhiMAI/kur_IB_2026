"use client";

import { CheckCircle2, Eye, EyeOff, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useTransition } from "react";

type Step = "details" | "verify";

export function EmailSignUpFlow({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => {
      setCountdown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  function startRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const data = new FormData(event.currentTarget);
    const nextEmail = String(data.get("email") ?? "").trim().toLowerCase();
    const nextPassword = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");
    const name = String(data.get("name") ?? "").trim();

    if (nextPassword !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/auth/register/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: nextEmail, password: nextPassword })
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        setError(result.message ?? "Не удалось начать регистрацию.");
        if (result.retryAfterSeconds) setCountdown(result.retryAfterSeconds);
        return;
      }

      setEmail(nextEmail);
      setPassword(nextPassword);
      setCountdown(result.resendAfterSeconds ?? 60);
      setStep("verify");
      setNotice(`Код отправлен на ${nextEmail}`);
    });
  }

  function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        setError(result.message ?? "Не удалось подтвердить email.");
        return;
      }

      const login = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (!login || login.error) {
        setNotice("Email подтверждён. Теперь войдите с вашим email и паролем.");
        router.push(`/auth/sign-in?callbackUrl=${encodeURIComponent(redirectTo)}`);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    });
  }

  function resend() {
    if (countdown > 0 || pending) return;
    setError(null);
    setNotice(null);

    startTransition(async () => {
      const response = await fetch("/api/auth/register/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        setError(result.message ?? "Не удалось отправить код повторно.");
        if (result.retryAfterSeconds) setCountdown(result.retryAfterSeconds);
        return;
      }

      setCountdown(result.resendAfterSeconds ?? 60);
      setNotice("Новый код отправлен.");
    });
  }

  if (step === "verify") {
    return (
      <div className="space-y-5">
        <div className="concept-panel-soft rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 text-[var(--accent-text)]" size={20} />
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Подтвердите email</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Мы отправили шестизначный код на <strong>{email}</strong>. Код действует 10 минут.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={verify} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--text-secondary)]">Код подтверждения</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="concept-input rounded-2xl px-4 py-3.5 text-center text-2xl font-semibold tracking-[0.4em]"
            />
          </label>

          {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
          {notice ? <div className="rounded-2xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">{notice}</div> : null}

          <button
            disabled={pending || code.length !== 6}
            className="concept-button-primary w-full rounded-2xl px-5 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Проверяем..." : "Подтвердить и войти"}
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <button type="button" onClick={() => setStep("details")} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            ← Изменить email
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={countdown > 0 || pending}
            className="font-semibold text-[var(--accent-text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {countdown > 0 ? `Отправить снова через ${countdown} сек.` : "Отправить код снова"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={startRegistration} className="space-y-4" noValidate>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-[var(--text-secondary)]">Имя</span>
        <input name="name" autoComplete="name" required minLength={2} className="concept-input rounded-2xl px-4 py-3.5" placeholder="Ваше имя" />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-[var(--text-secondary)]">Email</span>
        <input name="email" type="email" autoComplete="email" required className="concept-input rounded-2xl px-4 py-3.5" placeholder="you@gmail.com" />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-[var(--text-secondary)]">Пароль</span>
        <span className="relative block">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={10}
            className="concept-input rounded-2xl px-4 py-3.5 pr-12"
            placeholder="Минимум 10 символов и цифра"
          />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-2 my-auto grid h-9 w-9 place-items-center rounded-xl text-[var(--text-muted)]" aria-label="Показать пароль">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-[var(--text-secondary)]">Повторите пароль</span>
        <input name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={10} className="concept-input rounded-2xl px-4 py-3.5" placeholder="Повторите пароль" />
      </label>

      <div className="flex items-start gap-2 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-3)] p-4 text-xs leading-6 text-[var(--text-muted)]">
        <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--accent-text)]" size={17} />
        После отправки формы мы пришлём код подтверждения.
      </div>

      {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <button disabled={pending} className="concept-button-primary w-full rounded-2xl px-5 py-3.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-70">
        {pending ? "Отправляем код..." : "Зарегистрироваться по email"}
      </button>
    </form>
  );
}
