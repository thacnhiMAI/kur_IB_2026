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
          Tạo tài khoản bằng Gmail để vào thẳng hệ thống, không cần nhập mật khẩu thủ công.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <GoogleAuthButton mode="signup" enabled={googleEnabled} />
        <p className="text-sm text-slate-400">
          Hệ thống sẽ tạo tài khoản từ hồ sơ Google của bạn và đưa bạn vào phần hồ sơ đọc sách.
        </p>
      </div>

      <p className="text-center text-sm text-slate-400">
        Đã có tài khoản?{" "}
        <Link href="/auth/sign-in" className="text-cyan-300">
          Đăng nhập
        </Link>
      </p>
    </section>
  );
}
