import { createTestPrisma, seedTestDatabase } from "../tests/support/test-database";

const prisma = createTestPrisma();

seedTestDatabase(prisma)
  .then(() => console.info("Seeded RecruitIQ deterministic test fixtures."))
  .finally(() => prisma.$disconnect());
