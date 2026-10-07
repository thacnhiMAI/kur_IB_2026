"use client";

import React, { useEffect, useState } from "react";

import { applyAppSettings } from "@/components/preferences/preferences-controller";
import { RECENTLY_VIEWED_STORAGE_KEY } from "@/lib/books/recently-viewed";
import {
  DEFAULT_APP_SETTINGS,
  persistAppSettings,
  readAppSettingsFromBrowser,
  type AccentColor,
  type AppSettings,
  type InterfaceDensity,
  type MotionPreference,
  type ThemeMode
} from "@/lib/preferences/settings";

const ACCENTS: Array<{ value: AccentColor; label: string; color: string }> = [
  { value: "cyan", label: "Cyan", color: "#52d8ef" },
  { value: "violet", label: "Violet", color: "#9a7bff" },
  { value: "emerald", label: "Emerald", color: "#34d399" },
  { value: "amber", label: "Amber", color: "#fbbf24" },
  { value: "rose", label: "Rose", color: "#fb7185" }
];

function SettingRow({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 border-b border-[var(--surface-border)] py-5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.82fr)] md:items-center">
      <div>
        <p className="font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-3)] px-4 py-3">
      <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--accent-strong)]"
      />
    </label>
  );
}

export function SettingsPanel() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Настройки сохраняются локально в этом браузере.");

  useEffect(() => {
    setSettings(readAppSettingsFromBrowser());
    setReady(true);
  }, []);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    // Keep the React state updater pure. Persisting settings dispatches a
    // cross-component event, so doing it from inside setSettings() can cause
    // "Cannot update a component while rendering a different component".
    const next = { ...settings, [key]: value };
    setSettings(next);
    applyAppSettings(next);
    persistAppSettings(next);
    setMessage("Сохранено");
  }

  function reset() {
    const next = { ...DEFAULT_APP_SETTINGS };
    setSettings(next);
    persistAppSettings(next);
    applyAppSettings(next);
    setMessage("Настройки сброшены");
  }

  function clearRecentHistory() {
    try {
      window.localStorage.removeItem(RECENTLY_VIEWED_STORAGE_KEY);
      setMessage("История недавно просмотренных книг очищена");
    } catch {
      setMessage("Не удалось очистить локальную историю");
    }
  }

  if (!ready) {
    return (
      <div className="concept-panel-soft rounded-[28px] p-6 text-sm text-[var(--text-muted)]">
        Загрузка настроек...
      </div>
    );
  }

  return (
    <section id="settings" className="concept-panel rounded-[32px] p-6 sm:p-8">
      <div className="flex flex-col gap-4 border-b border-[var(--surface-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="concept-kicker">Preferences</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Настройки</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            Настройте внешний вид, поведение reader и локальную приватность. Изменения применяются сразу.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)]">{message}</span>
          <button type="button" onClick={reset} className="concept-button-secondary rounded-full px-4 py-2 text-xs font-semibold">
            Сбросить
          </button>
        </div>
      </div>

      <div className="mt-4">
        <p className="concept-kicker py-3">Внешний вид</p>

        <SettingRow title="Тема" description="Следовать системе или использовать постоянную тему.">
          <select
            value={settings.theme}
            onChange={(event) => update("theme", event.target.value as ThemeMode)}
            className="concept-input rounded-xl px-4 py-3"
          >
            <option value="system">Системная</option>
            <option value="dark">Тёмная</option>
            <option value="light">Светлая</option>
            <option value="contrast">Высокий контраст</option>
          </select>
        </SettingRow>

        <SettingRow title="Акцентный цвет" description="Основной цвет кнопок, подсветки и активных элементов.">
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((accent) => (
              <button
                key={accent.value}
                type="button"
                onClick={() => update("accent", accent.value)}
                aria-pressed={settings.accent === accent.value}
                className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  settings.accent === accent.value
                    ? "border-[var(--text-primary)] bg-[var(--surface-3)] text-[var(--text-primary)]"
                    : "border-[var(--surface-border)] text-[var(--text-muted)]"
                }`}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: accent.color }} />
                {accent.label}
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow title="Плотность интерфейса" description="Уменьшает вертикальные интервалы на насыщенных страницах.">
          <select
            value={settings.density}
            onChange={(event) => update("density", event.target.value as InterfaceDensity)}
            className="concept-input rounded-xl px-4 py-3"
          >
            <option value="comfortable">Комфортная</option>
            <option value="compact">Компактная</option>
          </select>
        </SettingRow>

        <SettingRow title="Размер интерфейса" description="Масштабирует базовый текст без изменения zoom браузера.">
          <select
            value={settings.textScale}
            onChange={(event) => update("textScale", Number(event.target.value) as AppSettings["textScale"])}
            className="concept-input rounded-xl px-4 py-3"
          >
            <option value={1}>100%</option>
            <option value={1.1}>110%</option>
            <option value={1.2}>120%</option>
          </select>
        </SettingRow>

        <SettingRow title="Анимации" description="Можно принудительно уменьшить движение или оставить системное поведение.">
          <select
            value={settings.motion}
            onChange={(event) => update("motion", event.target.value as MotionPreference)}
            className="concept-input rounded-xl px-4 py-3"
          >
            <option value="system">Системные</option>
            <option value="reduced">Минимум анимации</option>
            <option value="full">Полные анимации</option>
          </select>
        </SettingRow>

        <p className="concept-kicker py-5">Reader</p>

        <SettingRow title="Масштаб PDF по умолчанию" description="Стартовый масштаб при открытии внутреннего PDF.">
          <div className="space-y-2">
            <input
              type="range"
              min="0.75"
              max="1.5"
              step="0.05"
              value={settings.readerZoom}
              onChange={(event) => update("readerZoom", Number(event.target.value))}
              className="w-full accent-[var(--accent-strong)]"
            />
            <p className="text-right text-xs text-[var(--text-muted)]">{Math.round(settings.readerZoom * 100)}%</p>
          </div>
        </SettingRow>

        <SettingRow title="Скорость чтения вслух" description="Используется Web Speech API браузера для текущей страницы.">
          <div className="space-y-2">
            <input
              type="range"
              min="0.6"
              max="1.8"
              step="0.1"
              value={settings.speechRate}
              onChange={(event) => update("speechRate", Number(event.target.value))}
              className="w-full accent-[var(--accent-strong)]"
            />
            <p className="text-right text-xs text-[var(--text-muted)]">{settings.speechRate.toFixed(1)}×</p>
          </div>
        </SettingRow>

        <SettingRow title="Плавающая панель" description="Показывать расширенную панель reader при открытии книги.">
          <Toggle
            checked={settings.readerToolbarExpanded}
            onChange={(value) => update("readerToolbarExpanded", value)}
            label="Открывать панель развёрнутой"
          />
        </SettingRow>

        <SettingRow title="AI-помощник" description="Показывать AI-инструменты в reader. При наличии OPENAI_API_KEY используется внешний AI.">
          <Toggle checked={settings.readerAiEnabled} onChange={(value) => update("readerAiEnabled", value)} label="Показывать AI" />
        </SettingRow>

        <p className="concept-kicker py-5">Приватность на устройстве</p>

        <SettingRow title="Недавно просмотренные" description="Хранить до 10 последних карточек только в localStorage этого браузера.">
          <Toggle
            checked={settings.rememberRecentlyViewed}
            onChange={(value) => update("rememberRecentlyViewed", value)}
            label="Запоминать историю"
          />
        </SettingRow>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-5">
          <div>
            <p className="font-semibold text-[var(--text-primary)]">Очистить локальную историю</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Не удаляет избранное, отзывы или прогресс чтения из аккаунта.</p>
          </div>
          <button
            type="button"
            onClick={clearRecentHistory}
            className="rounded-full border border-rose-500/35 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
          >
            Очистить историю
          </button>
        </div>
      </div>
    </section>
  );
}
