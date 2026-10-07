export const APP_SETTINGS_STORAGE_KEY = "smart-library:settings:v1";
export const APP_SETTINGS_EVENT = "smart-library:settings-change";

export type ThemeMode = "system" | "dark" | "light" | "contrast";
export type AccentColor = "cyan" | "violet" | "emerald" | "amber" | "rose";
export type InterfaceDensity = "comfortable" | "compact";
export type MotionPreference = "system" | "reduced" | "full";

export type AppSettings = {
  theme: ThemeMode;
  accent: AccentColor;
  density: InterfaceDensity;
  motion: MotionPreference;
  textScale: 1 | 1.1 | 1.2;
  readerZoom: number;
  speechRate: number;
  readerToolbarExpanded: boolean;
  readerAiEnabled: boolean;
  rememberRecentlyViewed: boolean;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: "system",
  accent: "cyan",
  density: "comfortable",
  motion: "system",
  textScale: 1,
  readerZoom: 1,
  speechRate: 1,
  readerToolbarExpanded: true,
  readerAiEnabled: true,
  rememberRecentlyViewed: true
};

const THEMES = new Set<ThemeMode>(["system", "dark", "light", "contrast"]);
const ACCENTS = new Set<AccentColor>(["cyan", "violet", "emerald", "amber", "rose"]);
const DENSITIES = new Set<InterfaceDensity>(["comfortable", "compact"]);
const MOTIONS = new Set<MotionPreference>(["system", "reduced", "full"]);
const TEXT_SCALES = new Set([1, 1.1, 1.2]);

function clamp(value: unknown, minimum: number, maximum: number, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, number));
}

export function normalizeAppSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_APP_SETTINGS };
  }

  const input = value as Partial<AppSettings>;
  const textScaleCandidate = Number(input.textScale);

  return {
    theme: THEMES.has(input.theme as ThemeMode)
      ? (input.theme as ThemeMode)
      : DEFAULT_APP_SETTINGS.theme,
    accent: ACCENTS.has(input.accent as AccentColor)
      ? (input.accent as AccentColor)
      : DEFAULT_APP_SETTINGS.accent,
    density: DENSITIES.has(input.density as InterfaceDensity)
      ? (input.density as InterfaceDensity)
      : DEFAULT_APP_SETTINGS.density,
    motion: MOTIONS.has(input.motion as MotionPreference)
      ? (input.motion as MotionPreference)
      : DEFAULT_APP_SETTINGS.motion,
    textScale: TEXT_SCALES.has(textScaleCandidate)
      ? (textScaleCandidate as AppSettings["textScale"])
      : DEFAULT_APP_SETTINGS.textScale,
    readerZoom: clamp(input.readerZoom, 0.75, 1.5, DEFAULT_APP_SETTINGS.readerZoom),
    speechRate: clamp(input.speechRate, 0.6, 1.8, DEFAULT_APP_SETTINGS.speechRate),
    readerToolbarExpanded:
      typeof input.readerToolbarExpanded === "boolean"
        ? input.readerToolbarExpanded
        : DEFAULT_APP_SETTINGS.readerToolbarExpanded,
    readerAiEnabled:
      typeof input.readerAiEnabled === "boolean"
        ? input.readerAiEnabled
        : DEFAULT_APP_SETTINGS.readerAiEnabled,
    rememberRecentlyViewed:
      typeof input.rememberRecentlyViewed === "boolean"
        ? input.rememberRecentlyViewed
        : DEFAULT_APP_SETTINGS.rememberRecentlyViewed
  };
}

export function parseAppSettings(raw: string | null): AppSettings {
  if (!raw) {
    return { ...DEFAULT_APP_SETTINGS };
  }

  try {
    return normalizeAppSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function readAppSettingsFromBrowser(): AppSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_APP_SETTINGS };
  }

  try {
    return parseAppSettings(window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY));
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function persistAppSettings(settings: AppSettings) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    // Dispatch after the current React update/render stack completes.
    // A synchronous custom event here can make another component call setState
    // while React is still evaluating the updater that persisted the settings.
    queueMicrotask(() => {
      window.dispatchEvent(new CustomEvent(APP_SETTINGS_EVENT, { detail: settings }));
    });
  } catch {
    // localStorage can be unavailable in private/restricted browser contexts.
  }
}
