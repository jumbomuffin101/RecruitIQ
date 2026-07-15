CREATE TYPE "InterviewScorecardStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "InterviewCriterionType" AS ENUM ('REQUIREMENT_VALIDATION', 'TECHNICAL', 'BEHAVIORAL', 'EXPERIENCE', 'PROJECT', 'GENERAL');
CREATE TYPE "InterviewSignal" AS ENUM ('STRONG_NEGATIVE', 'NEGATIVE', 'NEUTRAL', 'POSITIVE', 'STRONG_POSITIVE');

CREATE TABLE "InterviewScorecard" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "evaluationId" TEXT,
  "status" "InterviewScorecardStatus" NOT NULL DEFAULT 'DRAFT',
  "version" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "InterviewScorecard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InterviewCriterion" (
  "id" TEXT NOT NULL,
  "scorecardId" TEXT NOT NULL,
  "requirementResultId" TEXT,
  "requirementText" TEXT,
  "type" "InterviewCriterionType" NOT NULL,
  "title" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "evaluationGuidance" TEXT,
  "weight" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InterviewCriterion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InterviewResponse" (
  "id" TEXT NOT NULL,
  "scorecardId" TEXT NOT NULL,
  "criterionId" TEXT NOT NULL,
  "rating" INTEGER,
  "signal" "InterviewSignal",
  "notes" TEXT,
  "evidence" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InterviewResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InterviewScorecard_candidateId_jobId_createdAt_idx" ON "InterviewScorecard"("candidateId", "jobId", "createdAt");
CREATE INDEX "InterviewScorecard_evaluationId_idx" ON "InterviewScorecard"("evaluationId");
CREATE INDEX "InterviewCriterion_scorecardId_sortOrder_idx" ON "InterviewCriterion"("scorecardId", "sortOrder");
CREATE INDEX "InterviewCriterion_requirementResultId_idx" ON "InterviewCriterion"("requirementResultId");
CREATE UNIQUE INDEX "InterviewResponse_scorecardId_criterionId_key" ON "InterviewResponse"("scorecardId", "criterionId");
CREATE INDEX "InterviewResponse_criterionId_idx" ON "InterviewResponse"("criterionId");

ALTER TABLE "InterviewScorecard"
  ADD CONSTRAINT "InterviewScorecard_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "InterviewScorecard_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "InterviewScorecard_evaluationId_fkey"
  FOREIGN KEY ("evaluationId") REFERENCES "CandidateEvaluation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InterviewCriterion"
  ADD CONSTRAINT "InterviewCriterion_scorecardId_fkey"
  FOREIGN KEY ("scorecardId") REFERENCES "InterviewScorecard"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "InterviewCriterion_requirementResultId_fkey"
  FOREIGN KEY ("requirementResultId") REFERENCES "RequirementResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InterviewResponse"
  ADD CONSTRAINT "InterviewResponse_scorecardId_fkey"
  FOREIGN KEY ("scorecardId") REFERENCES "InterviewScorecard"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "InterviewResponse_criterionId_fkey"
  FOREIGN KEY ("criterionId") REFERENCES "InterviewCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
