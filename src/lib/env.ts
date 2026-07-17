import { z } from "zod";
import { isTestAuthEnabled } from "@/lib/test-auth";

const authEnvironmentSchema = z.object({
  AUTH_SECRET: z.string().min(16),
  AUTH_GITHUB_ID: z.string().min(1),
  AUTH_GITHUB_SECRET: z.string().min(1),
});

export function assertDatabaseEnvironment() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("RecruitIQ server configuration is incomplete. DATABASE_URL is required.");
  }
}

export function assertAuthEnvironment() {
  if (isTestAuthEnabled()) return;

  const parsed = authEnvironmentSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error("RecruitIQ server configuration is incomplete. Configure AUTH_SECRET, AUTH_GITHUB_ID, and AUTH_GITHUB_SECRET.");
  }
}
