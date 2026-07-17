-- Clerk owns authentication, sessions, and organization membership. These
-- nullable fields let existing Auth.js-era records be linked deliberately.
ALTER TABLE "User" ADD COLUMN "clerkUserId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "clerkOrganizationId" TEXT;

CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");
CREATE UNIQUE INDEX "Organization_clerkOrganizationId_key" ON "Organization"("clerkOrganizationId");

-- The legacy Account, Session, and VerificationToken tables are intentionally
-- retained for data safety. RecruitIQ no longer reads or writes them.
