import fs from "node:fs";
import path from "node:path";
import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

const fixtures = path.join(process.cwd(), "tests", "fixtures");

function requiredEnvironment(name: "E2E_CLERK_ADMIN_EMAIL" | "E2E_CLERK_INTERVIEWER_EMAIL") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for Clerk E2E tests.`);
  return value;
}

async function signInAs(page: import("@playwright/test").Page, email: string) {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
}

async function getResumeUpload(page: import("@playwright/test").Page) {
  await expect(page).toHaveURL(/\/candidates/);
  const upload = page.getByLabel("Upload resume file");
  await expect(upload).toHaveCount(1);
  await expect(upload).toBeAttached();
  await expect(upload).toBeEnabled();
  await expect(upload).toHaveAttribute("data-hydrated", "true");
  await expect(upload).toHaveAttribute("accept", ".pdf,.txt,application/pdf,text/plain");
  return upload;
}

test("Clerk administrator can parse a TXT resume before reviewing candidate fields", async ({ page }) => {
  const resumePath = path.join(fixtures, "resume.txt");
  expect(fs.existsSync(resumePath)).toBe(true);
  await signInAs(page, requiredEnvironment("E2E_CLERK_ADMIN_EMAIL"));
  await page.goto("/candidates");
  const upload = await getResumeUpload(page);
  const [parseResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/resume/parse") && response.request().method() === "POST"),
    upload.setInputFiles(resumePath),
  ]);
  expect(parseResponse.status()).toBe(200);
  await expect(page.getByText("Text extracted")).toBeVisible();
});

test("Clerk interviewer cannot see hiring-management forms", async ({ page }) => {
  await signInAs(page, requiredEnvironment("E2E_CLERK_INTERVIEWER_EMAIL"));
  await page.goto("/jobs");
  await expect(page.getByText("cannot create or edit jobs")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create job" })).toHaveCount(0);
  await page.goto("/candidates");
  await expect(page.getByText("cannot create candidates or applications")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Candidate" })).toHaveCount(0);
});
