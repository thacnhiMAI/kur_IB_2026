import { signIn } from "@/auth";

type GoogleAuthButtonProps = {
  mode: "signin" | "signup";
  redirectTo?: string;
  enabled: boolean;
};

function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
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

    await signIn("google", { redirectTo });
  }

  const label =
    mode === "signup" ? "Регистрация через Google" : "Вход через Google";

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
        Google OAuth не настроен в `.env`. Укажите `GOOGLE_CLIENT_ID` и
        `GOOGLE_CLIENT_SECRET`, чтобы включить быстрый вход.
      </div>
    );
  }

  return (
    <form action={handleGoogleAuth} className="flex justify-center">
      <button
        aria-label={label}
        title={label}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-white text-slate-950 transition hover:bg-slate-100"
      >
        <MailIcon />
      </button>
    </form>
  );
}
