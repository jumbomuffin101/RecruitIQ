-- Add structured, versioned evaluation models without removing the legacy
-- ResumeAnalysis and InterviewKit tables used by the current UI.

CREATE TYPE "RequirementType" AS ENUM ('REQUIRED', 'PREFERRED');
CREATE TYPE "RequirementCategory" AS ENUM ('SKILL', 'EXPERIENCE', 'EDUCATION', 'PROJECT', 'DOMAIN', 'OTHER');
CREATE TYPE "EvaluationSource" AS ENUM ('DETERMINISTIC', 'OPENROUTER', 'HYBRID');
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
CREATE TYPE "EvaluationScoreCategory" AS ENUM ('REQUIRED_SKILLS', 'PREFERRED_QUALIFICATIONS', 'RELEVANT_EXPERIENCE', 'PROJECT_ALIGNMENT', 'EDUCATION', 'DOMAIN_ALIGNMENT');
CREATE TYPE "RequirementMatchStatus" AS ENUM ('MATCHED', 'PARTIAL', 'MISSING');

CREATE TABLE "JobRequirement" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "type" "RequirementType" NOT NULL,
  "category" "RequirementCategory" NOT NULL,
  "weight" INTEGER NOT NULL,
  "keywords" TEXT[],
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "JobRequirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CandidateEvaluation" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "overallScore" INTEGER,
  "confidence" DOUBLE PRECISION,
  "recommendation" TEXT,
  "summary" TEXT,
  "source" "EvaluationSource" NOT NULL,
  "status" "EvaluationStatus" NOT NULL DEFAULT 'PENDING',
  "scoringVersion" TEXT NOT NULL,
  "promptVersion" TEXT,
  "modelName" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "CandidateEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvaluationCategoryScore" (
  "id" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "category" "EvaluationScoreCategory" NOT NULL,
  "score" INTEGER NOT NULL,
  "maxScore" INTEGER NOT NULL,
  "weight" INTEGER NOT NULL,
  "explanation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EvaluationCategoryScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RequirementResult" (
  "id" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "requirementId" TEXT NOT NULL,
  "status" "RequirementMatchStatus" NOT NULL,
  "score" INTEGER NOT NULL,
  "maxScore" INTEGER NOT NULL,
  "confidence" DOUBLE PRECISION,
  "explanation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RequirementResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvaluationEvidence" (
  "id" TEXT NOT NULL,
  "evaluationId" TEXT NOT NULL,
  "requirementResultId" TEXT,
  "resumeSection" TEXT,
  "excerpt" TEXT NOT NULL,
  "startOffset" INTEGER,
  "endOffset" INTEGER,
  "confidence" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EvaluationEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CandidateEvaluation_candidateId_jobId_createdAt_idx" ON "CandidateEvaluation"("candidateId", "jobId", "createdAt");
CREATE INDEX "CandidateEvaluation_jobId_status_createdAt_idx" ON "CandidateEvaluation"("jobId", "status", "createdAt");
CREATE INDEX "RequirementResult_evaluationId_idx" ON "RequirementResult"("evaluationId");
CREATE INDEX "RequirementResult_requirementId_idx" ON "RequirementResult"("requirementId");
CREATE INDEX "EvaluationEvidence_evaluationId_idx" ON "EvaluationEvidence"("evaluationId");
CREATE INDEX "EvaluationEvidence_requirementResultId_idx" ON "EvaluationEvidence"("requirementResultId");

ALTER TABLE "JobRequirement"
  ADD CONSTRAINT "JobRequirement_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandidateEvaluation"
  ADD CONSTRAINT "CandidateEvaluation_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandidateEvaluation"
  ADD CONSTRAINT "CandidateEvaluation_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvaluationCategoryScore"
  ADD CONSTRAINT "EvaluationCategoryScore_evaluationId_fkey"
  FOREIGN KEY ("evaluationId") REFERENCES "CandidateEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RequirementResult"
  ADD CONSTRAINT "RequirementResult_evaluationId_fkey"
  FOREIGN KEY ("evaluationId") REFERENCES "CandidateEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RequirementResult"
  ADD CONSTRAINT "RequirementResult_requirementId_fkey"
  FOREIGN KEY ("requirementId") REFERENCES "JobRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvaluationEvidence"
  ADD CONSTRAINT "EvaluationEvidence_evaluationId_fkey"
  FOREIGN KEY ("evaluationId") REFERENCES "CandidateEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EvaluationEvidence"
  ADD CONSTRAINT "EvaluationEvidence_requirementResultId_fkey"
  FOREIGN KEY ("requirementResultId") REFERENCES "RequirementResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
