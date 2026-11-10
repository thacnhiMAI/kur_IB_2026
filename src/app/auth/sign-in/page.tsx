import React from "react";
import Link from "next/link";

import { CredentialsSignInForm } from "@/components/auth/credentials-sign-in-form";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { AuthVisualArt } from "@/components/auth/auth-visual-art";

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const rawCallback = params.callbackUrl;
  const redirectTo = rawCallback?.startsWith("/") && !rawCallback.startsWith("//") ? rawCallback : "/profile";
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const authErrors: Record<string, string> = {
    AccountNotRegistered: "Аккаунт с этим email ещё не создан. Сначала зарегистрируйтесь.",
    GoogleIdentityMismatch: "Google-аккаунт связан с другим профилем. Выйдите из аккаунта. Если ошибка повторится, необходимо исправить ошибочную связь Google в базе данных.",
    GoogleEmailUnverified: "Google не подтвердил адрес email. Выберите аккаунт с подтверждённым email.",
    EmailNotVerified: "Сначала подтвердите email своего аккаунта.",
    AccessDenied: "Вход запрещён. Проверьте состояние аккаунта.",
    OAuthAccountNotLinked: "Для этого email уже существует аккаунт с другим способом входа."
  };
  const authError = params.error ? authErrors[params.error] ?? "Не удалось войти через Google. Попробуйте ещё раз." : null;

  return (
    <section className="auth-shell grid overflow-hidden rounded-[30px] border border-[var(--surface-border)] bg-[var(--surface-1)] shadow-[0_40px_120px_var(--shadow-color)] lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.82fr)]">
      <div className="auth-visual-panel relative hidden min-h-[650px] overflow-hidden border-r border-[var(--surface-border)] p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="auth-visual-panel relative hidden min-h-[650px] overflow-hidden border-r border-[var(--surface-border)] p-10 lg:flex lg:flex-col lg:justify-between">

        <div className="relative z-10 max-w-xl">
          <p className="concept-kicker">УМНАЯ БИБЛИОТЕКА</p>
          <h1 className="mt-6 text-5xl leading-[1.02] tracking-[-0.035em] text-[var(--text-primary)]">
            Возвращайтесь к книгам с того места, где остановились.
          </h1>
          <p className="mt-6 text-lg leading-8 text-[var(--text-secondary)]">
            Избранное, прогресс, AI-помощник и приватный reader доступны после входа.
          </p>
        </div>

        <AuthVisualArt />

        <div className="relative z-10 text-sm text-[var(--text-muted)]">
          Для учёбы. Для открытий. Для себя.
        </div>
        </div>
      </div>

      <div className="flex min-h-[650px] items-center p-6 sm:p-10 lg:p-12">
        <div className="mx-auto w-full max-w-md space-y-7">
          <div>
            <p className="concept-kicker">ДОБРО ПОЖАЛОВАТЬ</p>
            <h2 className="mt-3 text-4xl text-[var(--text-primary)]">Вход</h2>
            <p className="mt-3 leading-7 text-[var(--text-secondary)]">Быстрее всего — через Google. Email и пароль остаются запасным способом входа.</p>
          </div>

          {authError && (
            <div role="alert" className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-[var(--text-primary)]">
              {authError}
            </div>
          )}
          <GoogleAuthButton mode="signin" enabled={googleEnabled} redirectTo={redirectTo} />

          <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            <div className="h-px flex-1 bg-[var(--surface-border)]" />
            <span>или по email</span>
            <div className="h-px flex-1 bg-[var(--surface-border)]" />
          </div>

          <CredentialsSignInForm redirectTo={redirectTo} />

          <p className="text-center text-sm text-[var(--text-muted)]">
            Нет аккаунта?{" "}
            <Link href={`/auth/sign-up?callbackUrl=${encodeURIComponent(redirectTo)}`} className="font-semibold text-[var(--accent-text)] hover:underline">
              Создать аккаунт
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
