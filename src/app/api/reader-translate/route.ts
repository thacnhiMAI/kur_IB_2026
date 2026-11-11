import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { translationLanguages, translationTextLimit } from "@/lib/reading/translation";

const language = z.string().refine((code) => Object.hasOwn(translationLanguages, code));
const requestSchema = z.object({
  source: language,
  target: language,
  text: z.string().trim().min(1).max(translationTextLimit)
}).refine(({ source, target }) => source !== target);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.accessBlocked) {
    return NextResponse.json({ error: "Войдите, чтобы перевести текст." }, { status: 401 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте текст и языки перевода." }, { status: 400 });
  }

  const { source, target, text } = parsed.data;
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.search = new URLSearchParams({ client: "gtx", sl: source, tl: target, dt: "t", q: text }).toString();
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(8000)])
    });
    if (response.ok) {
      const payload: unknown = await response.json();
      if (Array.isArray(payload) && Array.isArray(payload[0])) {
        const translation = payload[0].flatMap((segment: unknown) =>
          Array.isArray(segment) && typeof segment[0] === "string" ? [segment[0]] : []
        ).join("").trim();
        if (translation) return NextResponse.json({ translation });
      }
    }
  } catch {
    // The user can retry after a network error or timeout.
  }
  return NextResponse.json({ error: "Перевод временно недоступен. Попробуйте ещё раз." }, { status: 502 });
}
