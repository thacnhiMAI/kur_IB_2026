import { expect, test } from "@playwright/test";

test("phase e public routes keep shell, metadata assets, and key navigation working", async ({
  page
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /Откройте книгу/ })
  ).toBeVisible();
  await expect(page.locator("link[rel='manifest']")).toHaveCount(1);

  await page.getByRole("link", { name: "В библиотеку" }).first().click();
  await expect(page).toHaveURL(/\/catalog/);
  await expect(page.getByLabel("Поиск и фильтры каталога")).toBeVisible();

  await page.goto("/books/design-of-everyday-things");
  await expect(
    page.getByRole("heading", { name: "Дизайн привычных вещей" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Открыть книгу в 3D / AR" })).toBeVisible();
});
