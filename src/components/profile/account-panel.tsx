"use client";

import { Camera, Eye, EyeOff, KeyRound, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

function emitProfileUpdated() {
  window.dispatchEvent(new Event("smart-library:profile-updated"));
}

export function AccountPanel({
  initialName,
  email,
  initialImage
}: {
  initialName: string;
  email: string;
  initialImage: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(initialName);
  const [image, setImage] = useState(initialImage);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [passwordStep, setPasswordStep] = useState<"idle" | "verify">("idle");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setInterval(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  function saveName() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/profile/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result.message ?? "Не удалось изменить имя.");
        return;
      }
      setName(result.name);
      setMessage("Имя сохранено.");
      emitProfileUpdated();
      router.refresh();
    });
  }

  function uploadAvatar(file: File | null) {
    if (!file) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const data = new FormData();
      data.set("avatar", file);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result.message ?? "Не удалось загрузить аватар.");
        return;
      }
      setImage(result.image);
      setMessage("Аватар обновлён.");
      emitProfileUpdated();
      router.refresh();
    });
  }

  function requestPasswordCode() {
    if (countdown > 0 || pending) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/profile/password/start", { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result.message ?? "Не удалось отправить код.");
        if (result.retryAfterSeconds) setCountdown(result.retryAfterSeconds);
        return;
      }
      setPasswordStep("verify");
      setCountdown(result.resendAfterSeconds ?? 60);
      setMessage(`Код отправлен на ${result.email ?? email}.`);
    });
  }

  function changePassword() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/profile/password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password, confirmPassword })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result.message ?? "Не удалось изменить пароль.");
        return;
      }
      setMessage("Пароль изменён.");
      setPasswordStep("idle");
      setCode("");
      setPassword("");
      setConfirmPassword("");
    });
  }

  const initial = (name || email || "U").slice(0, 1).toUpperCase();

  return (
    <section className="concept-panel rounded-[32px] p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-5">
          <button
            type="button"
            className="profile-avatar-button"
            onClick={() => setAvatarOpen(true)}
            aria-label="Посмотреть или изменить аватар"
          >
            {image ? <img src={image} alt="Аватар профиля" /> : <span>{initial}</span>}
            <span className="profile-avatar-camera"><Camera size={16} /></span>
          </button>
          <div>
            <p className="concept-kicker">Профиль читателя</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{name || "Без имени"}</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{email}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-3)] px-4 py-3 text-xs leading-5 text-[var(--text-muted)]">
          Нажмите на аватар, чтобы открыть изображение или загрузить новое.
        </div>
      </div>

      {(message || error) ? (
        <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${error ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-[var(--surface-border-strong)] bg-[var(--accent-soft)] text-[var(--text-secondary)]"}`}>
          {error ?? message}
        </div>
      ) : null}

      <div className="mt-7 grid gap-5 xl:grid-cols-2">
        <div className="concept-panel-soft rounded-[24px] p-5">
          <div className="flex items-center gap-3">
            <UserRound size={20} className="text-[var(--accent-text)]" />
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Имя профиля</h2>
              <p className="text-xs text-[var(--text-muted)]">Отображается в ваших опубликованных отзывах.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input value={name} onChange={(event) => setName(event.target.value)} className="concept-input rounded-xl px-4 py-3" minLength={2} maxLength={80} />
            <button type="button" disabled={pending || name.trim().length < 2} onClick={saveName} className="concept-button-primary shrink-0 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50">Сохранить</button>
          </div>
        </div>

        <div className="concept-panel-soft rounded-[24px] p-5">
          <div className="flex items-center gap-3">
            <KeyRound size={20} className="text-[var(--accent-text)]" />
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Пароль</h2>
              <p className="text-xs text-[var(--text-muted)]">Смена пароля подтверждается кодом, отправленным на {email}.</p>
            </div>
          </div>

          {passwordStep === "idle" ? (
            <button type="button" onClick={requestPasswordCode} disabled={pending || countdown > 0} className="concept-button-secondary mt-4 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50">
              {countdown > 0 ? `Отправить код снова через ${countdown} сек.` : "Получить код и изменить пароль"}
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="concept-input rounded-xl px-4 py-3 text-center tracking-[0.32em]" placeholder="000000" />
              <div className="relative">
                <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete="new-password" className="concept-input rounded-xl px-4 py-3 pr-12" placeholder="Новый пароль" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-2 my-auto grid h-9 w-9 place-items-center rounded-xl text-[var(--text-muted)]" aria-label="Показать пароль">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete="new-password" className="concept-input rounded-xl px-4 py-3" placeholder="Повторите новый пароль" />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={changePassword} disabled={pending || code.length !== 6 || password.length < 10 || confirmPassword.length < 10} className="concept-button-primary rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50">Подтвердить смену</button>
                <button type="button" onClick={requestPasswordCode} disabled={pending || countdown > 0} className="concept-button-secondary rounded-xl px-4 py-3 text-sm disabled:opacity-50">{countdown > 0 ? `Новый код через ${countdown} сек.` : "Отправить код снова"}</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {avatarOpen ? (
        <div className="profile-avatar-modal" role="dialog" aria-modal="true" aria-label="Аватар профиля" onClick={() => setAvatarOpen(false)}>
          <div className="profile-avatar-dialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setAvatarOpen(false)} className="profile-avatar-close" aria-label="Закрыть"><X size={20} /></button>
            <div className="profile-avatar-preview">{image ? <img src={image} alt="Аватар профиля" /> : <span>{initial}</span>}</div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => uploadAvatar(event.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={pending} className="concept-button-primary mt-5 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-50">
              <Camera size={17} /> Загрузить новый аватар
            </button>
            <p className="mt-3 text-center text-xs text-[var(--text-muted)]">JPG, PNG или WebP · до 5 МБ</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
