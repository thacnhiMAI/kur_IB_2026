import { expect, test } from "@playwright/test";

test("recommendations page shows summary, insights, and card reasons", async ({ page }) => {
  await page.goto("/auth/sign-in");

  await page.getByLabel("Email", { exact: true }).fill("reader@example.com");
  await page.locator('input[name="password"]').fill("Reader12345");
  await page.getByRole("button", { name: "Войти по email" }).click();

  await expect(page).toHaveURL(/\/profile/);

  await page.goto("/recommendations");
  await expect(page.getByRole("heading", { name: "Персональные рекомендации" })).toBeVisible();

  await page.getByRole("button", { name: "Обновить рекомендации" }).click();

  await expect(page.getByText("Любимые жанры")).toBeVisible();
  await expect(page.getByTestId("recommendation-insight-strip")).toBeVisible();
  await expect(page.getByTestId("recommendation-card").first()).toBeVisible({
    timeout: 20000
  });
  await expect(page.getByTestId("recommendation-card").first().getByRole("link").last()).toBeVisible();
});
