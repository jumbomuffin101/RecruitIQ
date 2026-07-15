ALTER TABLE "JobRequirement"
  ADD COLUMN "isCritical" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "JobEvaluationRubric" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "requiredSkillsWeight" INTEGER NOT NULL DEFAULT 30,
  "preferredWeight" INTEGER NOT NULL DEFAULT 10,
  "experienceWeight" INTEGER NOT NULL DEFAULT 25,
  "projectWeight" INTEGER NOT NULL DEFAULT 15,
  "educationWeight" INTEGER NOT NULL DEFAULT 10,
  "domainWeight" INTEGER NOT NULL DEFAULT 10,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "JobEvaluationRubric_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobEvaluationRubric_jobId_key" ON "JobEvaluationRubric"("jobId");

ALTER TABLE "JobEvaluationRubric"
  ADD CONSTRAINT "JobEvaluationRubric_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CandidateEvaluation"
  ADD COLUMN "rubricSnapshot" JSONB;

ALTER TABLE "RequirementResult"
  ADD COLUMN "requirementText" TEXT,
  ADD COLUMN "requirementType" "RequirementType",
  ADD COLUMN "requirementCategory" "RequirementCategory",
  ADD COLUMN "requirementWeight" INTEGER,
  ADD COLUMN "requirementIsCritical" BOOLEAN NOT NULL DEFAULT false;
