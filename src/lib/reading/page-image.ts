export const MAX_PAGE_IMAGE_BYTES = 3_500_000;

export async function readerPageFile(image: Blob, page: number) {
  if (image.size <= MAX_PAGE_IMAGE_BYTES) {
    return new File([image], `page-${page}.png`, { type: "image/png" });
  }

  const bitmap = await createImageBitmap(image);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Не удалось подготовить изображение страницы.");
    context.drawImage(bitmap, 0, 0);
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!jpeg || jpeg.size > MAX_PAGE_IMAGE_BYTES) throw new Error("Изображение страницы слишком большое.");
    return new File([jpeg], `page-${page}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
