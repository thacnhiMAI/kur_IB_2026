import React from "react";
import Link from "next/link";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";

export default function SignUpPage() {
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  return (
    <section className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Регистрация</h1>
        <p className="text-slate-300">
          Нажмите на значок почты, чтобы войти через Google без отдельного
          пароля.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <GoogleAuthButton mode="signup" enabled={googleEnabled} />
        <p className="text-sm text-slate-400">
          Аккаунт будет создан автоматически из вашего профиля Google.
        </p>
      </div>

      <p className="text-center text-sm text-slate-400">
        Уже есть аккаунт?{" "}
        <Link href="/auth/sign-in" className="text-cyan-300">
          Вход
        </Link>
      </p>
    </section>
  );
}
