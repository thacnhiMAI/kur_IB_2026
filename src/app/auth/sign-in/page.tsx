import React from "react";
import Link from "next/link";

import { signIn } from "@/auth";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

export default function SignInPage() {
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  async function signInWithCredentials(formData: FormData) {
    "use server";

    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/profile"
    });
  }

  return (
    <section className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Đăng nhập</h1>
        <p className="text-slate-300">
          Vào nhanh bằng Gmail, hoặc dùng email và mật khẩu nếu bạn đã có tài khoản cũ.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <GoogleAuthButton mode="signin" enabled={googleEnabled} />

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-500">
          <div className="h-px flex-1 bg-slate-800" />
          <span>hoặc</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <form action={signInWithCredentials} className="space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
          />
          <input
            name="password"
            type="password"
            placeholder="Mật khẩu"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
          />
          <button className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950">
            Đăng nhập bằng mật khẩu
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-slate-400">
        Chưa có tài khoản?{" "}
        <Link href="/auth/sign-up" className="text-cyan-300">
          Dùng Gmail để tạo tài khoản
        </Link>
      </p>
    </section>
  );
}
