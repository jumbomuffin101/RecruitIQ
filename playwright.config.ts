import { defineConfig, devices } from "@playwright/test";

const databaseUrl = process.env.DATABASE_URL_TEST?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL_TEST is required for Playwright. The browser suite never uses DATABASE_URL directly.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://127.0.0.1:3100/api/health",
    // Never attach E2E to a developer server that may have a different auth configuration.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: "recruitiq-e2e-test-secret-not-for-production",
      AUTH_TRUST_HOST: "true",
      AUTH_URL: "http://127.0.0.1:3100",
      RECRUITIQ_TEST_AUTH: "true",
      OPENROUTER_API_KEY: "",
    },
  },
});
