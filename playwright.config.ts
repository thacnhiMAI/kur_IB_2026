import { defineConfig } from "@playwright/test";

const port = Number(process.env.PORT ?? process.env.PLAYWRIGHT_PORT ?? 3000);
const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://${host}:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  webServer: {
    command: `npm run dev -- --hostname ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI
  }
});
