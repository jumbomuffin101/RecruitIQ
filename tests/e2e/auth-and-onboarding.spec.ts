import { expect, test } from "@playwright/test";

async function signInAs(page: import("@playwright/test").Page, user: "admin" | "onboarding") {
  await page.goto("/sign-in");
  await page.getByTestId("test-user-key").selectOption(user);
  await page.getByTestId("test-sign-in").click();
}

test("unauthenticated hiring routes redirect to sign in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("heading", { name: "Sign in to your hiring workspace" })).toBeVisible();
});

test("test administrator reaches the dashboard and can sign out", async ({ page }) => {
  await signInAs(page, "admin");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("RecruitIQ Test A")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("a user without an organization completes onboarding as an administrator", async ({ page }) => {
  await signInAs(page, "onboarding");
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Organization name").fill("Onboarding Test Workspace");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Onboarding Test Workspace")).toBeVisible();
});
