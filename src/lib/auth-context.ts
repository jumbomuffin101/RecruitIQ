import "server-only";

import { UserRole } from "@prisma/client";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { mapClerkOrganizationRole } from "@/lib/clerk-roles";
import { assertClerkEnvironment } from "@/lib/env";
import { logger } from "@/lib/logger";
import { hasRole } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";

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

export class IdentityLinkRequiredError extends Error {
  constructor() {
    super("This RecruitIQ identity must be linked to its Clerk identity before it can be used.");
  }
}

export type CurrentUserContext = {
  clerkUserId: string;
  clerkOrganizationId: string;
  userId: string;
  organizationId: string;
  organizationName: string;
  role: UserRole;
  name: string;
};

function createOrganizationSlug(name: string, clerkOrganizationId: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
  return `${base}-${clerkOrganizationId.slice(-8).toLowerCase()}`;
}

async function getClerkUserOrThrow(clerkUserId: string) {
  const user = await currentUser();
  if (!user || user.id !== clerkUserId) {
    logger.warn("authentication_required", { reason: "clerk_user_missing" });
    throw new AuthenticationRequiredError();
  }
  return user;
}

async function syncPrismaUser({
  clerkUserId,
  organizationId,
  role,
}: {
  clerkUserId: string;
  organizationId?: string;
  role?: UserRole;
}) {
  const prisma = getPrisma();
  const clerkUser = await getClerkUserOrThrow(clerkUserId);
  const email = clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
  const name = clerkUser.fullName || clerkUser.username || "RecruitIQ user";
  const image = clerkUser.imageUrl || null;
  const existing = await prisma.user.findUnique({ where: { clerkUserId } });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        email,
        image,
        ...(organizationId ? { organizationId } : {}),
        ...(role ? { role } : {}),
      },
    });
  }

  if (email) {
    const legacyUser = await prisma.user.findUnique({ where: { email } });
    if (legacyUser) {
      logger.warn("identity_link_required", { userId: legacyUser.id, reason: "legacy_email_match" });
      throw new IdentityLinkRequiredError();
    }
  }

  return prisma.user.create({
    data: {
      clerkUserId,
      name,
      email,
      image,
      organizationId,
      role: role ?? UserRole.RECRUITER,
    },
  });
}

async function syncPrismaOrganization(clerkOrganizationId: string) {
  const prisma = getPrisma();
  const clerk = await clerkClient();
  const clerkOrganization = await clerk.organizations.getOrganization({ organizationId: clerkOrganizationId });

  return prisma.organization.upsert({
    where: { clerkOrganizationId },
    update: { name: clerkOrganization.name },
    create: {
      clerkOrganizationId,
      name: clerkOrganization.name,
      slug: createOrganizationSlug(clerkOrganization.name, clerkOrganizationId),
    },
  });
}

export async function requireAuthenticatedUser() {
  assertClerkEnvironment();
  const { userId } = await auth();
  if (!userId) {
    logger.warn("authentication_required");
    throw new AuthenticationRequiredError();
  }
  return syncPrismaUser({ clerkUserId: userId });
}

export async function getCurrentUserContext(): Promise<CurrentUserContext> {
  assertClerkEnvironment();
  const { userId, orgId, orgRole } = await auth();
  if (!userId) {
    logger.warn("authentication_required");
    throw new AuthenticationRequiredError();
  }
  if (!orgId) throw new OnboardingRequiredError();

  const role = mapClerkOrganizationRole(orgRole);
  if (!role) {
    logger.warn("authorization_denied", { reason: "unmapped_clerk_role" });
    throw new AuthorizationError();
  }

  const organization = await syncPrismaOrganization(orgId);
  const user = await syncPrismaUser({ clerkUserId: userId, organizationId: organization.id, role });

  return {
    clerkUserId: userId,
    clerkOrganizationId: orgId,
    userId: user.id,
    organizationId: organization.id,
    organizationName: organization.name,
    role,
    name: user.name || "RecruitIQ user",
  };
}

export async function requireRole(...roles: UserRole[]) {
  const context = await getCurrentUserContext();
  if (!hasRole(context.role, roles)) {
    logger.warn("authorization_denied", { userId: context.userId, organizationId: context.organizationId, reason: context.role });
    throw new AuthorizationError();
  }
  return context;
}

export const hiringManagerRoles = [UserRole.ADMIN, UserRole.RECRUITER] as const;
