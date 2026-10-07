export type ARPreviewMode = "webxr" | "3d-fallback" | "2d-fallback";

export type ARFallbackReason =
  | "xr-unsupported"
  | "immersive-ar-unavailable"
  | "webgl-unsupported"
  | "renderer-init-failed"
  | "camera-denied"
  | "desktop-device";

export type ARBookPayload = {
  slug: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  description: string;
  coverImage?: string | null;
  dominantColor?: string | null;
  year: number;
  language: string;
  pages: number;
  publisher?: string | null;
  edition?: string | null;
};

export const DEFAULT_AR_COVER = "/covers/fallback-book.jpg";
export const DEFAULT_AR_COLOR = "#0F172A";
