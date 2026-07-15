CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'SCREENED', 'INTERVIEW', 'OFFER', 'REJECTED');

ALTER TABLE "Application" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Application"
  ALTER COLUMN "status" TYPE "ApplicationStatus"
  USING "status"::text::"ApplicationStatus";
ALTER TABLE "Application" ALTER COLUMN "status" SET DEFAULT 'APPLIED'::"ApplicationStatus";

CREATE TABLE "ApplicationStatusHistory" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "fromStatus" "ApplicationStatus",
  "toStatus" "ApplicationStatus" NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,

  CONSTRAINT "ApplicationStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApplicationStatusHistory_applicationId_changedAt_idx"
  ON "ApplicationStatusHistory"("applicationId", "changedAt");

ALTER TABLE "ApplicationStatusHistory"
  ADD CONSTRAINT "ApplicationStatusHistory_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing applications already hold a stage. Preserve it as their first history entry;
-- Candidate.status is intentionally not used or synchronized after this migration.
INSERT INTO "ApplicationStatusHistory" ("id", "applicationId", "fromStatus", "toStatus", "changedAt", "note")
SELECT
  'backfill-' || "id",
  "id",
  NULL,
  "status",
  "createdAt",
  'Backfilled from existing application stage.'
FROM "Application";
