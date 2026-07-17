import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

function requiredEnvironment(name: "E2E_CLERK_ADMIN_EMAIL" | "E2E_CLERK_ONBOARDING_EMAIL") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for Clerk E2E tests.`);
  return value;
}

async function signInAs(page: import("@playwright/test").Page, email: string) {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
}

test("unauthenticated hiring routes redirect to Clerk sign in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/clerk\/sign-in/);
});

test("Clerk administrator reaches the dashboard and can sign out", async ({ page }) => {
  await signInAs(page, requiredEnvironment("E2E_CLERK_ADMIN_EMAIL"));
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
  await clerk.signOut({ page });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/clerk\/sign-in/);
});

test("a signed-in user without an active organization sees Clerk onboarding", async ({ page }) => {
  await signInAs(page, requiredEnvironment("E2E_CLERK_ONBOARDING_EMAIL"));
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "Choose your organization" })).toBeVisible();
});
