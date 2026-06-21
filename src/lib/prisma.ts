import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

export function getPrisma() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not configured. Add a PostgreSQL connection string in Vercel or copy .env.example to .env for local development.",
    );
  }

  if (!prisma) {
    prisma = new PrismaClient();
  }

  return prisma;
}
