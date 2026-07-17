import { UserRole } from "@prisma/client";

const clerkRoleMap: Record<string, UserRole> = {
  "org:admin": UserRole.ADMIN,
  "org:recruiter": UserRole.RECRUITER,
  "org:interviewer": UserRole.INTERVIEWER,
  // Clerk's default member role is intentionally least-privilege in RecruitIQ.
  "org:member": UserRole.INTERVIEWER,
};

export function mapClerkOrganizationRole(clerkRole: string | null | undefined): UserRole | null {
  if (!clerkRole) return null;
  return clerkRoleMap[clerkRole] ?? null;
}
