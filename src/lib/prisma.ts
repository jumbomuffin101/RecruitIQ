import { PrismaClient } from "@prisma/client";
import { assertDatabaseEnvironment } from "@/lib/env";

let prisma: PrismaClient | null = null;

export function getPrisma() {
  assertDatabaseEnvironment();

  if (!prisma) {
    prisma = new PrismaClient();
  }

  return prisma;
}
