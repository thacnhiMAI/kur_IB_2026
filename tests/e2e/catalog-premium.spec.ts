import { expect, test } from "@playwright/test";

test("catalog shows premium shelf layout", async ({ page }) => {
  const catalogUrl = process.env.PLAYWRIGHT_BASE_URL
    ? new URL("/catalog", process.env.PLAYWRIGHT_BASE_URL).toString()
    : "/catalog";

  await page.goto(catalogUrl);
  if ((await page.getByRole("heading", { name: "404" }).count()) > 0) {
    await page.goto(catalogUrl);
  }

  await expect(page.getByRole("heading", { name: "Каталог", exact: true })).toBeVisible();
  await expect(page.getByTestId("featured-shelf")).toBeVisible();
  await expect(page.getByTestId("book-card-3d").first()).toBeVisible();
});
