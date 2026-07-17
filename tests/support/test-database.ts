import { PrismaClient, UserRole } from "@prisma/client";

export const TEST_CLERK_IDENTITIES = {
  organizationA: { id: process.env.E2E_CLERK_ORG_A_ID ?? "org_recruitiq_test_a", name: process.env.E2E_CLERK_ORG_A_NAME ?? "RecruitIQ Test A" },
  organizationB: { id: process.env.E2E_CLERK_ORG_B_ID ?? "org_recruitiq_test_b", name: process.env.E2E_CLERK_ORG_B_NAME ?? "RecruitIQ Test B" },
  admin: { id: process.env.E2E_CLERK_ADMIN_USER_ID ?? "user_recruitiq_test_admin", email: process.env.E2E_CLERK_ADMIN_EMAIL ?? "admin@recruitiq.test" },
  recruiter: { id: process.env.E2E_CLERK_RECRUITER_USER_ID ?? "user_recruitiq_test_recruiter", email: process.env.E2E_CLERK_RECRUITER_EMAIL ?? "recruiter@recruitiq.test" },
  interviewer: { id: process.env.E2E_CLERK_INTERVIEWER_USER_ID ?? "user_recruitiq_test_interviewer", email: process.env.E2E_CLERK_INTERVIEWER_EMAIL ?? "interviewer@recruitiq.test" },
  onboarding: { id: process.env.E2E_CLERK_ONBOARDING_USER_ID ?? "user_recruitiq_test_onboarding", email: process.env.E2E_CLERK_ONBOARDING_EMAIL ?? "onboarding@recruitiq.test" },
  otherAdmin: { id: process.env.E2E_CLERK_OTHER_ADMIN_USER_ID ?? "user_recruitiq_test_other_admin", email: process.env.E2E_CLERK_OTHER_ADMIN_EMAIL ?? "other-admin@recruitiq.test" },
} as const;

export function getTestDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL_TEST?.trim();
  if (!databaseUrl) return null;

  const normalized = databaseUrl.toLowerCase();
  if (!normalized.includes("test") || normalized.includes("amazonaws.com") || normalized.includes("neon.tech")) {
    throw new Error("DATABASE_URL_TEST must point to a disposable PostgreSQL test database.");
  }

  return databaseUrl;
}

export function configureTestDatabase() {
  const databaseUrl = getTestDatabaseUrl();
  if (!databaseUrl) return false;
  process.env.DATABASE_URL = databaseUrl;
  return true;
}

export function createTestPrisma() {
  const databaseUrl = getTestDatabaseUrl();
  if (!databaseUrl) throw new Error("DATABASE_URL_TEST is required for database-backed tests.");
  return new PrismaClient({ datasources: { db: { url: databaseUrl } } });
}

export const testIds = {
  organizationA: "test-org-a",
  organizationB: "test-org-b",
  jobA: "test-job-a",
  jobB: "test-job-b",
  candidateA: "test-candidate-a",
  candidateB: "test-candidate-b",
  applicationA: "test-application-a",
  applicationB: "test-application-b",
  scorecardB: "test-scorecard-b",
} as const;

export async function seedTestDatabase(prisma: PrismaClient) {
  await prisma.user.deleteMany({ where: { clerkUserId: { in: [TEST_CLERK_IDENTITIES.admin.id, TEST_CLERK_IDENTITIES.recruiter.id, TEST_CLERK_IDENTITIES.interviewer.id, TEST_CLERK_IDENTITIES.onboarding.id, TEST_CLERK_IDENTITIES.otherAdmin.id] } } });
  await prisma.organization.deleteMany({ where: { slug: { in: ["recruitiq-test-a", "recruitiq-test-b"] } } });

  const organizationA = await prisma.organization.create({ data: { id: testIds.organizationA, clerkOrganizationId: TEST_CLERK_IDENTITIES.organizationA.id, name: TEST_CLERK_IDENTITIES.organizationA.name, slug: "recruitiq-test-a" } });
  const organizationB = await prisma.organization.create({ data: { id: testIds.organizationB, clerkOrganizationId: TEST_CLERK_IDENTITIES.organizationB.id, name: TEST_CLERK_IDENTITIES.organizationB.name, slug: "recruitiq-test-b" } });

  await prisma.user.createMany({
    data: [
      { clerkUserId: TEST_CLERK_IDENTITIES.admin.id, name: "Test Admin", email: TEST_CLERK_IDENTITIES.admin.email, organizationId: organizationA.id, role: UserRole.ADMIN },
      { clerkUserId: TEST_CLERK_IDENTITIES.recruiter.id, name: "Test Recruiter", email: TEST_CLERK_IDENTITIES.recruiter.email, organizationId: organizationA.id, role: UserRole.RECRUITER },
      { clerkUserId: TEST_CLERK_IDENTITIES.interviewer.id, name: "Test Interviewer", email: TEST_CLERK_IDENTITIES.interviewer.email, organizationId: organizationA.id, role: UserRole.INTERVIEWER },
      { clerkUserId: TEST_CLERK_IDENTITIES.onboarding.id, name: "New Workspace Owner", email: TEST_CLERK_IDENTITIES.onboarding.email, role: UserRole.RECRUITER },
      { clerkUserId: TEST_CLERK_IDENTITIES.otherAdmin.id, name: "Other Admin", email: TEST_CLERK_IDENTITIES.otherAdmin.email, organizationId: organizationB.id, role: UserRole.ADMIN },
    ],
  });

  const [jobA, jobB] = await Promise.all([
    prisma.job.create({
      data: {
        id: testIds.jobA,
        organizationId: organizationA.id,
        title: "Platform Engineer",
        department: "Engineering",
        location: "New York, NY",
        type: "FULL_TIME",
        description: "Build reliable TypeScript services and PostgreSQL-backed systems.",
        requirements: "Required: TypeScript, PostgreSQL\nPreferred: AWS",
        status: "OPEN",
        jobRequirements: { create: [{ text: "TypeScript and PostgreSQL", type: "REQUIRED", category: "SKILL", weight: 10, keywords: ["typescript", "postgresql"], isCritical: true, sortOrder: 0 }] },
      },
    }),
    prisma.job.create({
      data: {
        id: testIds.jobB,
        organizationId: organizationB.id,
        title: "Security Engineer",
        department: "Engineering",
        location: "Boston, MA",
        type: "FULL_TIME",
        description: "Protect organization infrastructure.",
        requirements: "Required: security engineering",
        status: "OPEN",
      },
    }),
  ]);

  const [candidateA, candidateB] = await Promise.all([
    prisma.candidate.create({
      data: {
        id: testIds.candidateA,
        organizationId: organizationA.id,
        name: "Avery Candidate",
        email: "avery.candidate@recruitiq.test",
        roleAppliedFor: jobA.title,
        resumeText: "Avery Candidate\nPlatform Engineer\nSkills: TypeScript, PostgreSQL, AWS",
        resumeSummary: "Platform engineer with TypeScript and PostgreSQL experience.",
        skills: ["TypeScript", "PostgreSQL", "AWS"],
        experienceSummary: "Built reliable services using TypeScript and PostgreSQL.",
      },
    }),
    prisma.candidate.create({
      data: {
        id: testIds.candidateB,
        organizationId: organizationB.id,
        name: "Blake Candidate",
        email: "blake.candidate@recruitiq.test",
        roleAppliedFor: jobB.title,
        resumeText: "Blake Candidate\nSecurity Engineer\nSkills: Security, AWS",
        resumeSummary: "Security engineer with cloud experience.",
        skills: ["Security", "AWS"],
        experienceSummary: "Secured cloud infrastructure.",
      },
    }),
  ]);

  await prisma.application.createMany({
    data: [
      { id: testIds.applicationA, organizationId: organizationA.id, candidateId: candidateA.id, jobId: jobA.id, status: "APPLIED" },
      { id: testIds.applicationB, organizationId: organizationB.id, candidateId: candidateB.id, jobId: jobB.id, status: "INTERVIEW" },
    ],
  });

  await prisma.interviewScorecard.create({
    data: { id: testIds.scorecardB, candidateId: candidateB.id, jobId: jobB.id, version: "test-v1" },
  });

  return { organizationA, organizationB, jobA, jobB, candidateA, candidateB };
}
