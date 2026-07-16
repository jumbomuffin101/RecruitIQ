import { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { hasRole } from "@/lib/permissions";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Sign in is required to access RecruitIQ.");
  }
}

export class OnboardingRequiredError extends Error {
  constructor() {
    super("Finish organization setup before accessing the hiring workspace.");
  }
}

export class AuthorizationError extends Error {
  constructor() {
    super("You do not have permission to perform this action.");
  }
}

export type CurrentUserContext = {
  userId: string;
  organizationId: string;
  organizationName: string;
  role: UserRole;
  name: string;
};

export async function requireAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) throw new AuthenticationRequiredError();
  const user = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });
  if (!user) throw new AuthenticationRequiredError();
  return user;
}

export async function getCurrentUserContext(): Promise<CurrentUserContext> {
  const user = await requireAuthenticatedUser();
  if (!user.organizationId || !user.organization) throw new OnboardingRequiredError();
  return {
    userId: user.id,
    organizationId: user.organizationId,
    organizationName: user.organization.name,
    role: user.role,
    name: user.name || "RecruitIQ user",
  };
}

export async function requireRole(...roles: UserRole[]) {
  const context = await getCurrentUserContext();
  if (!hasRole(context.role, roles)) throw new AuthorizationError();
  return context;
}

export const hiringManagerRoles = [UserRole.ADMIN, UserRole.RECRUITER] as const;
