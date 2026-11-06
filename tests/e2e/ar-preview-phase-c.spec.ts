import { expect, test, type Page } from "@playwright/test";

async function gotoWithRetry(page: Page, path: string) {
  await page.goto(path);

  if ((await page.getByRole("heading", { name: "404" }).count()) > 0) {
    await page.goto(path);
  }
}

test("book detail opens ar route and shows a fallback-safe preview", async ({
  page
}) => {
  await gotoWithRetry(page, "/books/design-of-everyday-things");

  await expect(page.getByRole("heading", { name: "Открыть книгу в 3D / AR" })).toBeVisible();
  await expect(page.getByTestId("book-ar-qr")).toBeVisible();

  await page.getByRole("link", { name: "Открыть 3D / AR" }).click();

  await expect(page).toHaveURL(/\/ar\/books\/design-of-everyday-things/);

  if ((await page.getByRole("heading", { name: "404" }).count()) > 0) {
    await page.goto("/ar/books/design-of-everyday-things");
  }

  await expect(
    page
      .locator("[data-testid='ar-preview-webxr'], [data-testid='ar-preview-3d'], [data-testid='ar-preview-2d']")
      .first()
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Дизайн привычных вещей" }).first()
  ).toBeVisible();
});

test("scanning the book QR shows the cover and description over the camera feed", async ({ page }) => {
  await page.goto("/books/design-of-everyday-things");
  const qrImage = await page.getByTestId("book-ar-qr").locator("svg").screenshot();
  await page.addInitScript((qrData) => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const image = new Image();
        image.src = qrData;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 240;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = false;
        const stream = canvas.captureStream(12);
        const draw = () => {
          if (stream.active) {
            ctx.drawImage(image, 0, 0, 240, 240);
            requestAnimationFrame(draw);
          }
        };
        draw();
        return stream;
      }
    });
  }, `data:image/png;base64,${qrImage.toString("base64")}`);
  await page.goto("/catalog");
  await page.getByRole("button", { name: "Сканировать QR книги" }).click();
  const xrLink = page.getByRole("link", { name: "Открыть в WebXR" });
  await expect(xrLink).toHaveAttribute("href", "/ar/books/design-of-everyday-things");
  await expect(xrLink.locator("..")).toContainText("Дизайн привычных вещей");
  await page.getByRole("button", { name: "Закрыть камеру" }).click();
  await expect(xrLink).toHaveCount(0);
});
