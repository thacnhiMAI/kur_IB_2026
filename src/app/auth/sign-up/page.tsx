import React from "react";
import Link from "next/link";

import { EmailSignUpFlow } from "@/components/auth/email-sign-up-flow";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { AuthVisualArt } from "@/components/auth/auth-visual-art";

export default async function SignUpPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const rawCallback = params.callbackUrl;
  const redirectTo = rawCallback?.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/profile";
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <section className="auth-shell grid overflow-hidden rounded-[30px] border border-[var(--surface-border)] bg-[var(--surface-1)] shadow-[0_40px_120px_var(--shadow-color)] lg:grid-cols-[minmax(420px,0.88fr)_minmax(0,1.12fr)]">
      <div className="flex min-h-[680px] items-center p-6 sm:p-10 lg:p-12">
        <div className="mx-auto w-full max-w-md space-y-7">
          <div>
            <p className="concept-kicker">НОВЫЙ ЧИТАТЕЛЬ</p>
            <h1 className="mt-3 text-4xl text-[var(--text-primary)]">Регистрация</h1>
            {/*<p className="mt-3 leading-7 text-[var(--text-secondary)]">Google — основной и самый быстрый способ. Регистрация по email требует подтверждения кодом.</p>*/}
          </div>

          <GoogleAuthButton mode="signup" enabled={googleEnabled} redirectTo={redirectTo} />

          <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            <div className="h-px flex-1 bg-[var(--surface-border)]" />
            <span>или по email</span>
            <div className="h-px flex-1 bg-[var(--surface-border)]" />
          </div>

          <EmailSignUpFlow redirectTo={redirectTo} />

          <p className="text-center text-sm text-[var(--text-muted)]">
            Уже есть аккаунт?{" "}
            <Link href={`/auth/sign-in?callbackUrl=${encodeURIComponent(redirectTo)}`} className="font-semibold text-[var(--accent-text)] hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </div>

      <div className="auth-visual-panel relative hidden min-h-[680px] overflow-hidden border-l border-[var(--surface-border)] p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="relative max-w-xl">
          <p className="concept-kicker">ВАША СЛЕДУЮЩАЯ ИСТОРИЯ — ЗДЕСЬ</p>
          <h2 className="mt-6 text-5xl leading-[1.03] text-[var(--text-primary)]">Один аккаунт. Вся ваша библиотека.</h2>
          <p className="mt-6 text-lg leading-8 text-[var(--text-secondary)]">После подтверждения email вы получите доступ к избранному, прогрессу чтения, рекомендациям и персональным настройкам.</p>
        </div>
        <div className="absolute inset-0 z-20 pointer-events-none transform scale-[0.70] origin-bottom">
          <AuthVisualArt />
        </div>
        {/*<div className="relative grid gap-3 sm:grid-cols-3">*/}
        {/*  {['Подтверждение email', 'Приватный reader', 'AI + рекомендации'].map((item) => (*/}
        {/*    <div key={item} className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-3)] p-4 text-sm text-[var(--text-secondary)]">{item}</div>*/}
        {/*  ))}*/}
        {/*</div>*/}
      </div>
    </section>
  );
}
