"use client";

import { useEffect } from "react";

import {
  APP_SETTINGS_EVENT,
  APP_SETTINGS_STORAGE_KEY,
  parseAppSettings,
  readAppSettingsFromBrowser,
  type AppSettings
} from "@/lib/preferences/settings";

function resolveTheme(settings: AppSettings) {
  if (settings.theme === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  return settings.theme;
}

export function applyAppSettings(settings: AppSettings) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.dataset.theme = resolveTheme(settings);
  root.dataset.themePreference = settings.theme;
  root.dataset.accent = settings.accent;
  root.dataset.density = settings.density;
  root.dataset.motion = settings.motion;
  root.style.setProperty("--app-text-scale", String(settings.textScale));
}

export function PreferencesController() {
  useEffect(() => {
    let settings = readAppSettingsFromBrowser();
    applyAppSettings(settings);

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const handleMedia = () => {
      if (settings.theme === "system") {
        applyAppSettings(settings);
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== APP_SETTINGS_STORAGE_KEY) {
        return;
      }

      settings = parseAppSettings(event.newValue ?? window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY));
      applyAppSettings(settings);
    };
    const handleCustom = (event: Event) => {
      const detail = (event as CustomEvent<AppSettings>).detail;
      settings = detail ?? readAppSettingsFromBrowser();
      applyAppSettings(settings);
    };

    media.addEventListener?.("change", handleMedia);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(APP_SETTINGS_EVENT, handleCustom);

    return () => {
      media.removeEventListener?.("change", handleMedia);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(APP_SETTINGS_EVENT, handleCustom);
    };
  }, []);

  return null;
}
