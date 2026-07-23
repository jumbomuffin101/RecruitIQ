import { PrismaClient } from "@prisma/client";

const legacyDemoSlugs = ["recruitiq-demo", "recruitiq-sample"] as const;
const confirmed = process.env.CONFIRM_REMOVE_LEGACY_DEMO_DATA === "true";
const dryRun = process.argv.includes("--dry-run") || process.env.DRY_RUN === "true";

async function main() {
  if (!confirmed) {
    throw new Error(
      "Refusing to remove legacy demo data. Set CONFIRM_REMOVE_LEGACY_DEMO_DATA=true and rerun with --dry-run first.",
    );
  }

  const prisma = new PrismaClient();

  try {
    const organizations = await prisma.organization.findMany({
      where: { slug: { in: [...legacyDemoSlugs] } },
      select: { id: true, name: true, slug: true },
      orderBy: { slug: "asc" },
    });

    if (organizations.length === 0) {
      console.info("No legacy RecruitIQ demo organizations were found.");
      return;
    }

    console.info(`${dryRun ? "Would remove" : "Removing"} only these legacy demo organizations:`);
    for (const organization of organizations) {
      console.info(`- ${organization.name} (${organization.slug})`);
    }

    if (dryRun) {
      console.info("Dry run complete. No data was deleted.");
      return;
    }

    for (const organization of organizations) {
      await prisma.organization.delete({ where: { id: organization.id } });
    }

    console.info("Legacy demo organization cleanup complete.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
