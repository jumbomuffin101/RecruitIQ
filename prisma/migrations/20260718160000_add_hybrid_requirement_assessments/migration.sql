CREATE TYPE "AiRequirementAssessment" AS ENUM ('NO_EVIDENCE', 'WEAK_EVIDENCE', 'PARTIAL_MATCH', 'STRONG_MATCH');

ALTER TABLE "RequirementResult"
  ADD COLUMN "deterministicStatus" "RequirementMatchStatus",
  ADD COLUMN "aiAssessment" "AiRequirementAssessment",
  ADD COLUMN "aiConfidence" DOUBLE PRECISION,
  ADD COLUMN "aiExplanation" TEXT;
