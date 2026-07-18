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

test("public landing page sends auth CTAs to Clerk and has no obsolete dashboard shortcut", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Sign in" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign up free" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Features" })).toHaveAttribute("href", "#features");
  await expect(page.getByRole("link", { name: "How it works" })).toHaveAttribute("href", "#workflow");
  await expect(page.getByText("Quick Start", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Open dashboard", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Sign in" }).first().click();
  await expect(page).toHaveURL(/\/clerk\/sign-in/);

  await page.goto("/");
  await page.getByRole("button", { name: "Sign up free" }).click();
  await expect(page).toHaveURL(/\/clerk\/sign-up/);
});

test("Clerk auth routes render RecruitIQ branding", async ({ page }) => {
  await page.goto("/clerk/sign-in");
  await expect(page.getByRole("link", { name: "RecruitIQ" })).toBeVisible();
  await expect(page.getByText("RecruitIQ account")).toBeVisible();

  await page.goto("/clerk/sign-up");
  await expect(page.getByRole("link", { name: "RecruitIQ" })).toBeVisible();
  await expect(page.getByText("RecruitIQ account")).toBeVisible();
});

test("unauthenticated hiring routes redirect to Clerk sign in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/clerk\/sign-in/);
});

test("Clerk administrator reaches the dashboard and can sign out", async ({ page }) => {
  await signInAs(page, requiredEnvironment("E2E_CLERK_ADMIN_EMAIL"));
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Go to dashboard" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign up free" })).toHaveCount(0);

  await clerk.signOut({ page });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/clerk\/sign-in/);
});

test("a signed-in user without an active organization sees Clerk onboarding", async ({ page }) => {
  await signInAs(page, requiredEnvironment("E2E_CLERK_ONBOARDING_EMAIL"));
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "Choose your organization" })).toBeVisible();
});
