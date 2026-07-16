import { UserRole } from "@prisma/client";

export function hasRole(role: UserRole, allowedRoles: readonly UserRole[]) {
  return allowedRoles.includes(role);
}

export function canManageHiring(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.RECRUITER;
}

export function canDeleteHiringData(role: UserRole) {
  return role === UserRole.ADMIN;
}

export function canSubmitInterviewFeedback(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.RECRUITER || role === UserRole.INTERVIEWER;
}
