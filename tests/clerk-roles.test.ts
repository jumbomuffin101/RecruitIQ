import assert from "node:assert/strict";
import test from "node:test";
import { mapClerkOrganizationRole } from "@/lib/clerk-roles";

test("Clerk organization roles map to RecruitIQ permissions with a least-privilege default", () => {
  assert.equal(mapClerkOrganizationRole("org:admin"), "ADMIN");
  assert.equal(mapClerkOrganizationRole("org:recruiter"), "RECRUITER");
  assert.equal(mapClerkOrganizationRole("org:interviewer"), "INTERVIEWER");
  assert.equal(mapClerkOrganizationRole("org:member"), "INTERVIEWER");
  assert.equal(mapClerkOrganizationRole("org:unknown"), null);
  assert.equal(mapClerkOrganizationRole(null), null);
});
