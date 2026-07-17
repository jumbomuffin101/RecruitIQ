import { PrismaClient, UserRole } from "@prisma/client";
import { TEST_AUTH_USER_EMAILS } from "@/lib/test-auth";

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
  await prisma.user.deleteMany({ where: { email: { in: Object.values(TEST_AUTH_USER_EMAILS) } } });
  await prisma.organization.deleteMany({ where: { slug: { in: ["recruitiq-test-a", "recruitiq-test-b"] } } });

  const organizationA = await prisma.organization.create({ data: { id: testIds.organizationA, name: "RecruitIQ Test A", slug: "recruitiq-test-a" } });
  const organizationB = await prisma.organization.create({ data: { id: testIds.organizationB, name: "RecruitIQ Test B", slug: "recruitiq-test-b" } });

  await prisma.user.createMany({
    data: [
      { name: "Test Admin", email: TEST_AUTH_USER_EMAILS.admin, organizationId: organizationA.id, role: UserRole.ADMIN },
      { name: "Test Recruiter", email: TEST_AUTH_USER_EMAILS.recruiter, organizationId: organizationA.id, role: UserRole.RECRUITER },
      { name: "Test Interviewer", email: TEST_AUTH_USER_EMAILS.interviewer, organizationId: organizationA.id, role: UserRole.INTERVIEWER },
      { name: "New Workspace Owner", email: TEST_AUTH_USER_EMAILS.onboarding, role: UserRole.RECRUITER },
      { name: "Other Admin", email: TEST_AUTH_USER_EMAILS.otherAdmin, organizationId: organizationB.id, role: UserRole.ADMIN },
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
