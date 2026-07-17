import path from "node:path";
import { expect, test } from "@playwright/test";

const fixtures = path.join(process.cwd(), "tests", "fixtures");

async function signInAs(page: import("@playwright/test").Page, user: "admin" | "interviewer") {
  await page.goto("/sign-in");
  await page.getByTestId("test-user-key").selectOption(user);
  await page.getByTestId("test-sign-in").click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("administrator can parse a TXT resume before reviewing candidate fields", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto("/candidates");
  await page.locator('input[type="file"]').setInputFiles(path.join(fixtures, "resume.txt"));
  await expect(page.getByText("resume.txt")).toBeVisible();
  await expect(page.getByText("Text extracted")).toBeVisible();
  await page.getByRole("button", { name: "Extract Candidate Details" }).click();
  await expect(page.getByRole("heading", { name: "Review candidate details" })).toBeVisible();
  await expect(page.locator('input[name="name"]')).toHaveValue("Taylor Quinn");
});

test("administrator can parse a text-based PDF resume and unsupported uploads are rejected", async ({ page }) => {
  await signInAs(page, "admin");
  await page.goto("/candidates");
  await page.locator('input[type="file"]').setInputFiles(path.join(fixtures, "resume.pdf"));
  await expect(page.getByText("resume.pdf")).toBeVisible();
  await expect(page.getByText("Text extracted")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(path.join(fixtures, "unsupported.resume"));
  await expect(page.getByText("Choose a PDF or TXT resume, or paste the resume text manually below.")).toBeVisible();
});

test("interviewer cannot see hiring-management forms", async ({ page }) => {
  await signInAs(page, "interviewer");
  await page.goto("/jobs");
  await expect(page.getByText("cannot create or edit jobs")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create job" })).toHaveCount(0);
  await page.goto("/candidates");
  await expect(page.getByText("cannot create candidates or applications")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Candidate" })).toHaveCount(0);
  await page.goto("/pipeline");
  await expect(page.getByRole("button", { name: "Update" })).toHaveCount(0);
});
