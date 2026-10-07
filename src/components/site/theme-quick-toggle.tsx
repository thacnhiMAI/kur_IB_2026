"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import {
  APP_SETTINGS_EVENT,
  persistAppSettings,
  readAppSettingsFromBrowser,
  type AppSettings
} from "@/lib/preferences/settings";

function resolveIsLight(settings: AppSettings) {
  if (settings.theme === "light") return true;
  if (settings.theme === "dark" || settings.theme === "contrast") return false;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches;
}

export function ThemeQuickToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const sync = () => setLight(resolveIsLight(readAppSettingsFromBrowser()));
    sync();
    window.addEventListener(APP_SETTINGS_EVENT, sync);
    return () => window.removeEventListener(APP_SETTINGS_EVENT, sync);
  }, []);

  function toggle() {
    const settings = readAppSettingsFromBrowser();
    const next: AppSettings = { ...settings, theme: light ? "dark" : "light" };
    persistAppSettings(next);
    setLight(!light);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="dashboard-header-icon-button"
      aria-label={light ? "Включить тёмную тему" : "Включить светлую тему"}
      title={light ? "Тёмная тема" : "Светлая тема"}
    >
      {light ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}
