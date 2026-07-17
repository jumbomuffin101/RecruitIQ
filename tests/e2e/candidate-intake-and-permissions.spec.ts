import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

const fixtures = path.join(process.cwd(), "tests", "fixtures");

async function signInAs(page: import("@playwright/test").Page, user: "admin" | "interviewer") {
  await page.goto("/sign-in");
  await expect(page.getByTestId("test-sign-in")).toBeVisible();
  await page.getByTestId("test-user-key").selectOption(user);
  await page.getByTestId("test-sign-in").click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function getResumeUpload(page: import("@playwright/test").Page) {
  await expect(page).toHaveURL(/\/candidates/);
  await expect(page.getByRole("button", { name: "Upload resume" })).toBeVisible();
  const upload = page.getByLabel("Upload resume file");
  await expect(upload).toHaveCount(1);
  await expect(upload).toBeAttached();
  await expect(upload).toBeEnabled();
  await expect(upload).toHaveAttribute("data-hydrated", "true");
  await expect(upload).toHaveAttribute("accept", ".pdf,.txt,application/pdf,text/plain");
  return upload;
}

test("administrator can parse a TXT resume before reviewing candidate fields", async ({ page }) => {
  const resumePath = path.join(fixtures, "resume.txt");
  expect(fs.existsSync(resumePath)).toBe(true);
  await signInAs(page, "admin");
  await page.goto("/candidates");
  const upload = await getResumeUpload(page);
  const [parseResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/resume/parse") &&
        response.request().method() === "POST",
    ),
    upload.setInputFiles(resumePath),
  ]);
  expect(parseResponse.status()).toBe(200);
  await expect(page.getByText("resume.txt")).toBeVisible();
  await expect(page.getByText("Text extracted")).toBeVisible();
  await page.getByRole("button", { name: "Extract Candidate Details" }).click();
  await expect(page.getByRole("heading", { name: "Review candidate details" })).toBeVisible();
  await expect(page.locator('input[name="name"]')).toHaveValue("Taylor Quinn");
});

test("administrator can parse a text-based PDF resume and unsupported uploads are rejected", async ({ page }) => {
  const pdfPath = path.join(fixtures, "resume.pdf");
  expect(fs.existsSync(pdfPath)).toBe(true);
  await signInAs(page, "admin");
  await page.goto("/candidates");
  const upload = await getResumeUpload(page);
  const [parseResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/resume/parse") &&
        response.request().method() === "POST",
    ),
    upload.setInputFiles(pdfPath),
  ]);
  expect(parseResponse.status()).toBe(200);
  await expect(page.getByText("resume.pdf")).toBeVisible();
  await expect(page.getByText("Text extracted")).toBeVisible();
  const unsupportedPath = path.join(fixtures, "unsupported.resume");
  expect(fs.existsSync(unsupportedPath)).toBe(true);
  let unsupportedRequestIssued = false;
  page.on("request", (request) => {
    if (request.url().includes("/api/resume/parse")) unsupportedRequestIssued = true;
  });
  await upload.setInputFiles(unsupportedPath);
  await expect(page.getByText("Choose a PDF or TXT resume, or paste the resume text manually below.")).toBeVisible();
  expect(unsupportedRequestIssued).toBe(false);
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
