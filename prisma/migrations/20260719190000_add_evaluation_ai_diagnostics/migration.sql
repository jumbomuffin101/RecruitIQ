ALTER TABLE "CandidateEvaluation"
  ADD COLUMN "narrativeSource" TEXT NOT NULL DEFAULT 'deterministic',
  ADD COLUMN "semanticAssessmentStatus" TEXT,
  ADD COLUMN "semanticAssessmentReason" TEXT,
  ADD COLUMN "narrativeStatus" TEXT,
  ADD COLUMN "narrativeReason" TEXT;

ALTER TABLE "ResumeAnalysis"
  ADD COLUMN "evaluationId" TEXT;

CREATE UNIQUE INDEX "ResumeAnalysis_evaluationId_key" ON "ResumeAnalysis"("evaluationId");

ALTER TABLE "ResumeAnalysis"
  ADD CONSTRAINT "ResumeAnalysis_evaluationId_fkey"
  FOREIGN KEY ("evaluationId") REFERENCES "CandidateEvaluation"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
