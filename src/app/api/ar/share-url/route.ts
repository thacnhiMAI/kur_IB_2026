import os from "node:os";

import { type NextRequest, NextResponse } from "next/server";

import { getARRoutePath } from "@/lib/ar/urls";

export const dynamic = "force-dynamic";

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizeConfiguredBase(value: string | undefined) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!/^https?:$/.test(url.protocol)) return null;
    return stripTrailingSlash(url.origin);
  } catch {
    return null;
  }
}

function isLoopbackHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "::1" || normalized.startsWith("127.");
}

function isPrivateIPv4(address: string) {
  if (/^10\./.test(address) || /^192\.168\./.test(address)) return true;
  const match = address.match(/^172\.(\d+)\./);
  if (!match) return false;
  const second = Number(match[1]);
  return second >= 16 && second <= 31;
}

function findLanIPv4() {
  const interfaces = os.networkInterfaces();
  const candidates: string[] = [];

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      if (isPrivateIPv4(entry.address)) candidates.unshift(entry.address);
      else candidates.push(entry.address);
    }
  }

  return candidates[0] ?? null;
}

function forwardedOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || request.nextUrl.protocol.replace(":", "") || "http";

  if (!host) return null;
  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

function withLanHostname(origin: string, lanAddress: string) {
  const url = new URL(origin);
  const port = url.port ? `:${url.port}` : "";
  return `${url.protocol}//${lanAddress}${port}`;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const configured =
    normalizeConfiguredBase(process.env.AR_PUBLIC_BASE_URL) ??
    normalizeConfiguredBase(process.env.NEXT_PUBLIC_AR_BASE_URL);

  let baseUrl: string;
  let source: "configured" | "request" | "lan" | "fallback";
  let warning: string | null = null;

  if (configured) {
    baseUrl = configured;
    source = "configured";
  } else {
    const requestOrigin = forwardedOrigin(request) ?? request.nextUrl.origin;
    const hostname = new URL(requestOrigin).hostname;

    if (!isLoopbackHostname(hostname)) {
      baseUrl = requestOrigin;
      source = "request";
    } else {
      const lanAddress = findLanIPv4();
      if (lanAddress) {
        baseUrl = withLanHostname(requestOrigin, lanAddress);
        source = "lan";
        warning =
          "QR использует LAN-адрес. Телефон и компьютер должны быть в одной сети. Для camera AR (WebXR immersive-ar) используйте HTTPS через AR_PUBLIC_BASE_URL.";
      } else {
        baseUrl = requestOrigin;
        source = "fallback";
        warning =
          "Не удалось определить LAN-адрес. Укажите AR_PUBLIC_BASE_URL с адресом, доступным с телефона.";
      }
    }
  }

  const url = new URL(getARRoutePath(slug), `${stripTrailingSlash(baseUrl)}/`).toString();
  const secure = url.startsWith("https://");

  if (!secure && source !== "configured") {
    warning ??=
      "Ссылка откроет 3D fallback, но WebXR camera AR обычно требует HTTPS secure context.";
  }

  return NextResponse.json(
    { url, baseUrl, source, secure, warning },
    { headers: { "Cache-Control": "no-store" } }
  );
}
