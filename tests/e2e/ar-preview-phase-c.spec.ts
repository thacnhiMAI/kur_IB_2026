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

  await expect(page.getByRole("heading", { name: "3D / AR Preview" })).toBeVisible();
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
    page.getByRole("heading", { name: "Дизайн привычных вещей" })
  ).toBeVisible();
});
