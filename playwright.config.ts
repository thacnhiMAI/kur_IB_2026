import { defineConfig } from "@playwright/test";

const port = Number(process.env.PORT ?? process.env.PLAYWRIGHT_PORT ?? 3000);
const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://${host}:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results/playwright",
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  webServer: {
    command: `npm run ${process.env.PLAYWRIGHT_PRODUCTION === "1" ? "start" : "dev"} -- --hostname ${host} --port ${port}`,
    url: baseURL,
    env: { AR_PUBLIC_BASE_URL: process.env.AR_PUBLIC_BASE_URL ?? baseURL },
    timeout: 90_000,
    reuseExistingServer: !process.env.CI
  }
});
