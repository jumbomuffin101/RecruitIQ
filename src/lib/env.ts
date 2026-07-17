import { z } from "zod";

const clerkEnvironmentSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
});

export function assertDatabaseEnvironment() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("RecruitIQ server configuration is incomplete. DATABASE_URL is required.");
  }
}

export function assertClerkEnvironment() {
  const parsed = clerkEnvironmentSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error("RecruitIQ server configuration is incomplete. Configure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY.");
  }
}
