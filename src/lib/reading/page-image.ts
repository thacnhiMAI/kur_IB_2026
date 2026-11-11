export const MAX_PAGE_IMAGE_BYTES = 3_500_000;

type Rect = { x: number; y: number; width: number; height: number };

export function readerImageBounds(rect: Rect, sheetAspect: number, imageWidth: number, imageHeight: number) {
  const imageAspect = imageWidth / imageHeight;
  const fitWidth = Math.min(1, imageAspect / sheetAspect);
  const fitHeight = Math.min(1, sheetAspect / imageAspect);
  const toPixel = (value: number, fit: number, size: number) =>
    Math.min(size, Math.max(0, (value - (1 - fit) / 2) / fit * size));
  return {
    left: toPixel(rect.x, fitWidth, imageWidth),
    top: toPixel(rect.y, fitHeight, imageHeight),
    right: toPixel(rect.x + rect.width, fitWidth, imageWidth),
    bottom: toPixel(rect.y + rect.height, fitHeight, imageHeight)
  };
}

export async function cropReaderPage(image: Blob, page: number, rect: Rect, sheetAspect: number) {
  const bitmap = await createImageBitmap(image);
  try {
    // Match the reader's object-fit: contain, including letterboxed pages.
    const bounds = readerImageBounds(rect, sheetAspect, bitmap.width, bitmap.height);
    const left = Math.floor(bounds.left);
    const top = Math.floor(bounds.top);
    const width = Math.ceil(bounds.right) - left;
    const height = Math.ceil(bounds.bottom) - top;
    if (!Number.isFinite(width + height) || width < 1 || height < 1) throw new Error("Выберите область внутри страницы.");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Не удалось подготовить выделение.");
    context.drawImage(bitmap, left, top, width, height, 0, 0, width, height);
    const crop = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!crop) throw new Error("Не удалось подготовить выделение.");
    return prepareReaderImage(crop, `page-${page}-selection`);
  } finally {
    bitmap.close();
  }
}

export async function readerPageFile(image: Blob, page: number) {
  return prepareReaderImage(image, `page-${page}`);
}

export async function prepareReaderImage(image: Blob, name: string) {
  if (image.size > 0 && image.size <= MAX_PAGE_IMAGE_BYTES && ["image/png", "image/jpeg"].includes(image.type)) {
    return new File([image], `${name}.${image.type === "image/png" ? "png" : "jpg"}`, { type: image.type });
  }

  const bitmap = await createImageBitmap(image);
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Не удалось подготовить изображение страницы.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!jpeg || jpeg.size > MAX_PAGE_IMAGE_BYTES) throw new Error("Изображение страницы слишком большое.");
    return new File([jpeg], `${name}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
