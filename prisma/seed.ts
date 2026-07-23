/**
 * Production and local workspaces start empty. Test fixtures are seeded only
 * through scripts/seed-test-db.ts after its DATABASE_URL_TEST safety checks.
 */
async function main() {
  console.info("No production seed data was created. New RecruitIQ workspaces start empty.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
