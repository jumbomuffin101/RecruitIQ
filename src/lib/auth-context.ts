import "server-only";

import { Prisma, type Organization, UserRole } from "@prisma/client";
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

function safeErrorReason(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return `${error instanceof Error ? error.name : "Error"}:${error.code}`;
  }
  return error instanceof Error ? error.name : "unknown";
}

function getPrismaCode(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
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
  try {
    const prisma = getPrisma();
    const clerkUser = await getClerkUserOrThrow(clerkUserId);
    const primaryEmail = clerkUser.primaryEmailAddress;
    const email = primaryEmail?.emailAddress?.toLowerCase() ?? null;
    const hasVerifiedPrimaryEmail = primaryEmail?.verification?.status === "verified";
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
        if (!legacyUser.clerkUserId && hasVerifiedPrimaryEmail) {
          logger.info("legacy_identity_linked", { userId: legacyUser.id, reason: "verified_primary_email_match" });
          return prisma.user.update({
            where: { id: legacyUser.id },
            data: {
              clerkUserId,
              name,
              email,
              image,
              ...(organizationId ? { organizationId } : {}),
              ...(role ? { role } : {}),
            },
          });
        }

        logger.warn("identity_link_required", { userId: legacyUser.id, reason: "ambiguous_or_unverified_email_match" });
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
  } catch (error) {
    logger.error("prisma_user_sync_failed", {
      reason: safeErrorReason(error),
      errorClass: error instanceof Error ? error.name : "unknown",
      prismaCode: getPrismaCode(error),
    });
    throw error;
  }
}

async function syncPrismaOrganization(clerkOrganizationId: string) {
  const prisma = getPrisma();
  const clerk = await clerkClient();
  const clerkOrganization = await clerk.organizations.getOrganization({ organizationId: clerkOrganizationId });

  let organization: Organization;
  try {
    organization = await prisma.organization.upsert({
      where: { clerkOrganizationId },
      update: { name: clerkOrganization.name },
      create: {
        clerkOrganizationId,
        name: clerkOrganization.name,
        slug: createOrganizationSlug(clerkOrganization.name, clerkOrganizationId),
      },
    });
  } catch (error) {
    // Concurrent first requests for a newly active Clerk organization can race on its unique mirror.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrentOrganization = await prisma.organization.findUnique({ where: { clerkOrganizationId } });
      if (!concurrentOrganization) throw error;
      organization = concurrentOrganization;
    } else {
      logger.error("prisma_organization_sync_failed", {
        clerkOrganizationId,
        reason: safeErrorReason(error),
        errorClass: error instanceof Error ? error.name : "unknown",
        prismaCode: getPrismaCode(error),
      });
      throw error;
    }
  }

  logger.info("prisma_organization_synced", {
    organizationId: organization.id,
    clerkOrganizationId,
    reason: "upserted",
  });
  return organization;
}

export async function requireClerkUser() {
  assertClerkEnvironment();
  const { userId } = await auth();
  if (!userId) {
    logger.warn("authentication_required");
    throw new AuthenticationRequiredError();
  }
  const user = await syncPrismaUser({ clerkUserId: userId });
  logger.info("prisma_user_synced", {
    userId: user.id,
    clerkUserId: userId,
    reason: "pre_organization",
  });
  return { clerkUserId: userId, userId: user.id };
}

export async function getCurrentUserContext(): Promise<CurrentUserContext> {
  assertClerkEnvironment();
  const { userId, orgId, orgRole } = await auth();
  if (!userId) {
    logger.warn("authentication_required");
    throw new AuthenticationRequiredError();
  }
  if (!orgId) {
    logger.info("clerk_workspace_context", {
      clerkUserId: userId,
      reason: "organization_missing",
    });
    throw new OnboardingRequiredError();
  }

  const role = mapClerkOrganizationRole(orgRole);
  if (!role) {
    logger.warn("authorization_denied", {
      clerkUserId: userId,
      clerkOrganizationId: orgId,
      reason: "unmapped_clerk_role",
    });
    throw new AuthorizationError();
  }

  logger.info("clerk_workspace_context", {
    clerkUserId: userId,
    clerkOrganizationId: orgId,
    mappedRole: role,
    reason: "organization_active",
  });

  const organization = await syncPrismaOrganization(orgId);
  const user = await syncPrismaUser({ clerkUserId: userId, organizationId: organization.id, role });
  logger.info("prisma_user_linked_to_workspace", {
    userId: user.id,
    organizationId: organization.id,
    clerkUserId: userId,
    clerkOrganizationId: orgId,
    mappedRole: role,
  });

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
