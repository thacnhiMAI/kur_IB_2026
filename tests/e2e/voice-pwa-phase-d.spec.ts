import { expect, test, type Page } from "@playwright/test";

async function waitForServiceWorkerReady(page: Page) {
  await page.waitForLoadState("networkidle");

  const serviceWorkerSupported = await page.evaluate(
    () => "serviceWorker" in navigator
  );

  expect(serviceWorkerSupported).toBe(true);

  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    await navigator.serviceWorker.ready;
  });

  await page.reload({ waitUntil: "networkidle" });
}

test("phase d voice search and pwa routes stay usable", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("/catalog");
  await waitForServiceWorkerReady(page);

  const searchInput = page.getByLabel("Быстрый поиск");

  await expect(searchInput).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Включить голосовой поиск" })
  ).toBeVisible();

  await searchInput.fill("Норман");
  await expect(
    page.getByRole("heading", { name: "Дизайн привычных вещей" })
  ).toBeVisible();

  await page.goto("/books/design-of-everyday-things");
  await expect(
    page.getByRole("heading", { name: "Дизайн привычных вещей" })
  ).toBeVisible();

  await context.setOffline(true);
  await page.goto("/catalog", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Каталог книг" })).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
  });
  await expect(page.getByRole("status")).toContainText(
    "Вы сейчас офлайн. Доступны сохранённые страницы."
  );

  await context.close();
});
