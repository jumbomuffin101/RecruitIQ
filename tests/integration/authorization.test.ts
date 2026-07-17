import assert from "node:assert/strict";
import test from "node:test";
import { EvaluationOwnershipError, evaluateCandidateForJob } from "@/lib/evaluations/service";
import { configureTestDatabase, createTestPrisma, seedTestDatabase, testIds } from "../support/test-database";

const hasTestDatabase = configureTestDatabase();
const integration = hasTestDatabase ? test : test.skip;

integration("organization-scoped queries treat cross-workspace IDs as absent", async () => {
  const prisma = createTestPrisma();
  try {
    await seedTestDatabase(prisma);
    const [foreignCandidate, foreignJob, foreignApplication, foreignScorecard] = await Promise.all([
      prisma.candidate.findFirst({ where: { id: testIds.candidateB, organizationId: testIds.organizationA } }),
      prisma.job.findFirst({ where: { id: testIds.jobB, organizationId: testIds.organizationA } }),
      prisma.application.findFirst({ where: { id: testIds.applicationB, organizationId: testIds.organizationA } }),
      prisma.interviewScorecard.findFirst({ where: { id: testIds.scorecardB, candidate: { organizationId: testIds.organizationA } } }),
    ]);

    assert.equal(foreignCandidate, null);
    assert.equal(foreignJob, null);
    assert.equal(foreignApplication, null);
    assert.equal(foreignScorecard, null);
  } finally {
    await prisma.$disconnect();
  }
});

integration("evaluation service rejects cross-organization candidate and job IDs before persistence", async () => {
  const prisma = createTestPrisma();
  const previousKey = process.env.OPENROUTER_API_KEY;
  try {
    await seedTestDatabase(prisma);
    delete process.env.OPENROUTER_API_KEY;
    await assert.rejects(
      () => evaluateCandidateForJob({ organizationId: testIds.organizationA, candidateId: testIds.candidateB, jobId: testIds.jobB }),
      EvaluationOwnershipError,
    );
    const evaluationCount = await prisma.candidateEvaluation.count({ where: { candidateId: testIds.candidateB } });
    assert.equal(evaluationCount, 0);
  } finally {
    if (previousKey) process.env.OPENROUTER_API_KEY = previousKey;
    else delete process.env.OPENROUTER_API_KEY;
    await prisma.$disconnect();
  }
});
