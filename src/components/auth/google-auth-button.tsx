import { signIn, signOut } from "@/auth";
import { cookies } from "next/headers";

type GoogleAuthButtonProps = {
  mode: "signin" | "signup";
  redirectTo?: string;
  enabled: boolean;
};

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" role="img">
      <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.14H12v4.05h5.38a4.6 4.6 0 0 1-2 3.02v2.63h3.24c1.9-1.75 2.98-4.33 2.98-7.56Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.21l-3.24-2.63c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.72A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.99A6.02 6.02 0 0 1 6.08 12c0-.69.12-1.36.31-1.99V7.29H3.05A10 10 0 0 0 2 12c0 1.61.38 3.14 1.05 4.71l3.34-2.72Z" />
      <path fill="#EA4335" d="M12 5.88c1.47 0 2.79.51 3.83 1.49l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.95 5.29l3.34 2.72C7.18 7.64 9.39 5.88 12 5.88Z" />
    </svg>
  );
}

export function GoogleAuthButton({
  mode,
  redirectTo = "/profile",
  enabled
}: GoogleAuthButtonProps) {
  async function handleGoogleAuth() {
    "use server";
    // A Google login is an identity switch, never implicit linking to whichever
    // demo/credentials account happened to be logged in in this browser.
    await signOut({ redirect: false });
    (await cookies()).set("smart-library-google-intent", mode, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/callback/google",
      maxAge: 600
    });
    await signIn("google", { redirectTo });
  }

  const label = mode === "signup" ? "Создать аккаунт через Gmail" : "Войти по Gmail";

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200">
        Google OAuth пока не настроен. Добавьте `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` в `.env`.
      </div>
    );
  }

  return (
    <form action={handleGoogleAuth}>
      <button
        type="submit"
        aria-label={label}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--surface-border-strong)] bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_12px_36px_rgba(0,0,0,0.14)] transition hover:-translate-y-0.5 hover:bg-slate-50"
      >
        <GoogleIcon />
        <span>{label}</span>
      </button>
    </form>
  );
}
