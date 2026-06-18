import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

export function getPrisma() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not configured. Copy .env.example to .env and point it at PostgreSQL.",
    );
  }

  if (!prisma) {
    prisma = new PrismaClient();
  }

  return prisma;
}
