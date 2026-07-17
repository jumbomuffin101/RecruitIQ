import { defineConfig, devices } from "@playwright/test";

const databaseUrl = process.env.DATABASE_URL_TEST?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL_TEST is required for Playwright. The browser suite never uses DATABASE_URL directly.");

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
const clerkSecretKey = process.env.CLERK_SECRET_KEY?.trim();
if (!clerkPublishableKey || !clerkSecretKey) {
  throw new Error("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY for a dedicated Clerk development instance are required for Playwright.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkPublishableKey,
      CLERK_SECRET_KEY: clerkSecretKey,
      OPENROUTER_API_KEY: "",
    },
  },
});
