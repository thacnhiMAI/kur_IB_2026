import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runLocalOcr } from "@/lib/ocr/local-ocr";

export async function readLocalImage(image: File, preferMath: boolean) {
  const extension = image.type === "image/jpeg" ? ".jpg" : ".png";
  const tempPath = join(tmpdir(), "smart-library-ocr-" + randomUUID() + extension);
  try {
    await writeFile(tempPath, Buffer.from(await image.arrayBuffer()));
    const result = await runLocalOcr(tempPath, { preferMath });
    return result;
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}
