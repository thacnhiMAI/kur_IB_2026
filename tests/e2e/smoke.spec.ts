import { expect, test } from "@playwright/test";

test("home page shows the product title and entry links", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Умная библиотека" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Каталог" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Рекомендации" }).first()).toBeVisible();
});

test("catalog page shows seeded content", async ({ page }) => {
  await page.goto("/catalog");

  await expect(page.getByRole("heading", { name: "Каталог книг" })).toBeVisible();
  await expect(
    page.locator("#catalog-results").getByRole("heading", { name: "Дизайн привычных вещей" })
  ).toBeVisible();
});

test("book detail page shows seeded book information", async ({ page }) => {
  await page.goto("/books/design-of-everyday-things");

  await expect(page.getByRole("heading", { name: "Дизайн привычных вещей" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Действия с книгой" })).toBeVisible();
  await expect(page.getByRole("button", { name: "В избранное" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Отметить интерес" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Отметить прочитанной" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Отзывы" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Оставить отзыв" })).toBeVisible();
});

test("sign-up page offers Gmail signup path", async ({ page }) => {
  await page.goto("/auth/sign-up");

  await expect(page.getByRole("heading", { name: /регистрация/i })).toBeVisible();
  await expect(
    page.getByText(/без отдельного пароля/i)
  ).toBeVisible();
});

test("protected recommendations page redirects unauthenticated users to sign-in", async ({ page }) => {
  await page.goto("/recommendations");

  await expect(page).toHaveURL(/\/auth\/sign-in/);
  await expect(page.getByRole("heading", { name: /вход/i })).toBeVisible();
});
