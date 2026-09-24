import { signIn } from "@/auth";

type GoogleAuthButtonProps = {
  mode: "signin" | "signup";
  redirectTo?: string;
  enabled: boolean;
};

export function GoogleAuthButton({
  mode,
  redirectTo = "/profile",
  enabled
}: GoogleAuthButtonProps) {
  async function handleGoogleAuth() {
    "use server";

    await signIn("google", { redirectTo });
  }

  const label =
    mode === "signup" ? "Tiếp tục với Gmail" : "Đăng nhập với Gmail";

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
        Google OAuth chưa được cấu hình trong `.env`. Hãy điền `GOOGLE_CLIENT_ID`
        và `GOOGLE_CLIENT_SECRET` để bật đăng nhập Gmail trực tiếp.
      </div>
    );
  }

  return (
    <form action={handleGoogleAuth}>
      <button className="flex w-full items-center justify-center rounded-lg border border-slate-700 bg-white px-4 py-3 font-medium text-slate-950 transition hover:bg-slate-100">
        {label}
      </button>
    </form>
  );
}
