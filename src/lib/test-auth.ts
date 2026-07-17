export const TEST_AUTH_USER_EMAILS = {
  admin: "admin@recruitiq.test",
  recruiter: "recruiter@recruitiq.test",
  interviewer: "interviewer@recruitiq.test",
  onboarding: "onboarding@recruitiq.test",
  otherAdmin: "other-admin@recruitiq.test",
} as const;

export type TestAuthUserKey = keyof typeof TEST_AUTH_USER_EMAILS;

export function canEnableTestAuth({
  nodeEnv = process.env.NODE_ENV,
  enabled = process.env.RECRUITIQ_TEST_AUTH,
}: {
  nodeEnv?: string;
  enabled?: string;
} = {}) {
  return nodeEnv !== "production" && enabled === "true";
}

export function isTestAuthEnabled() {
  return canEnableTestAuth();
}

export function isTestAuthUserKey(value: unknown): value is TestAuthUserKey {
  return typeof value === "string" && value in TEST_AUTH_USER_EMAILS;
}
