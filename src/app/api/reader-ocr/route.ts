import crypto from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { runLocalOcr } from "@/lib/ocr/local-ocr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.accessBlocked) {
    return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof File) || image.size <= 0 || image.size > 16 * 1024 * 1024) {
    return NextResponse.json({ error: "Некорректное изображение страницы." }, { status: 400 });
  }

  const extension = image.type.includes("jpeg") ? ".jpg" : ".png";
  const tempPath = path.join(os.tmpdir(), `smart-library-ocr-${crypto.randomUUID()}${extension}`);

  try {
    await writeFile(tempPath, Buffer.from(await image.arrayBuffer()));
    const preferMath = form?.get("preferMath") === "1" || form?.get("preferMath") === "true";
    const result = await runLocalOcr(tempPath, { preferMath });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Reader OCR failed:", error);
    return NextResponse.json(
      { error: "OCR не смог распознать эту страницу. Проверьте локальный OCR/Python в backend." },
      { status: 503 }
    );
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}
