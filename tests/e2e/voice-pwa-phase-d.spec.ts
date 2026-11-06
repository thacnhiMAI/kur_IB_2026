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

test("phase d voice search and pwa routes stay usable", async ({ context, page }) => {
  await context.addInitScript(() => {
    class TestSpeechRecognition {
      onresult?: (event: { results: Array<Array<{ transcript: string }>> }) => void;
      onend?: () => void;
      start() {
        this.onresult?.({ results: [[{ transcript: "Don Norman" }]] });
        this.onend?.();
      }
      stop() { this.onend?.(); }
    }
    Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: TestSpeechRecognition });
  });

  await page.goto("/catalog");
  await waitForServiceWorkerReady(page);

  const searchInput = page.getByLabel("Поиск и фильтры каталога");

  await expect(searchInput).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Включить голосовой поиск" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Включить голосовой поиск" }).click();
  await expect(searchInput).toHaveValue("Don Norman");
  await expect(page).toHaveURL(/q=/);
  await expect(
    page.locator("#catalog-results").getByRole("heading", { name: "Дизайн привычных вещей" })
  ).toBeVisible();

  await page.goto("/books/design-of-everyday-things");
  await expect(
    page.getByRole("heading", { name: "Дизайн привычных вещей" })
  ).toBeVisible();

  await context.setOffline(true);
  await page.goto("/catalog", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Каталог", exact: true })).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
  });
  await expect(page.getByRole("status")).toContainText(
    "Вы сейчас офлайн. Доступны сохранённые страницы."
  );
});
