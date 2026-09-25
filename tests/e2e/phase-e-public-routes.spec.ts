import { expect, test } from "@playwright/test";

test("phase e public routes keep shell, metadata assets, and key navigation working", async ({
  page
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Умная библиотека" })
  ).toBeVisible();
  await expect(page.locator("link[rel='manifest']")).toHaveCount(1);

  await page.getByRole("link", { name: "Каталог" }).first().click();
  await expect(page).toHaveURL(/\/catalog/);
  await expect(page.getByLabel("Быстрый поиск")).toBeVisible();

  await page.goto("/books/design-of-everyday-things");
  await expect(
    page.getByRole("heading", { name: "Дизайн привычных вещей" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "3D / AR Preview" })).toBeVisible();
});
