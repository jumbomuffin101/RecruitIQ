import { PrismaClient } from "@prisma/client";

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1]?.trim() : undefined;
}

const organizationId = argument("organization-id");
const clerkOrganizationId = argument("clerk-organization-id");
const userId = argument("user-id");
const clerkUserId = argument("clerk-user-id");

if (!organizationId || !clerkOrganizationId) {
  throw new Error("Usage: tsx scripts/link-clerk-identity.ts --organization-id <prisma-org-id> --clerk-organization-id <clerk-org-id> [--user-id <prisma-user-id> --clerk-user-id <clerk-user-id>]");
}

if (Boolean(userId) !== Boolean(clerkUserId)) {
  throw new Error("Provide both --user-id and --clerk-user-id, or neither.");
}

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.findUnique({ where: { id: organizationId } });
    if (!organization) throw new Error("Prisma organization was not found.");

    const existingOrganizationLink = await tx.organization.findUnique({ where: { clerkOrganizationId } });
    if (existingOrganizationLink && existingOrganizationLink.id !== organization.id) {
      throw new Error("That Clerk organization is already linked to a different RecruitIQ organization.");
    }

    await tx.organization.update({ where: { id: organization.id }, data: { clerkOrganizationId } });

    if (userId && clerkUserId) {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("Prisma user was not found.");
      const existingUserLink = await tx.user.findUnique({ where: { clerkUserId } });
      if (existingUserLink && existingUserLink.id !== user.id) {
        throw new Error("That Clerk user is already linked to a different RecruitIQ user.");
      }
      await tx.user.update({ where: { id: user.id }, data: { clerkUserId } });
    }
  });

  console.log("Clerk identity link saved.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Clerk identity linking failed.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
