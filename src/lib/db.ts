import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * On Netlify, the platform injects NETLIFY_DB_URL for the attached Netlify
 * Database (production uses the main branch, deploy previews get their own
 * branch). Locally, DATABASE_URL from `.env` takes precedence.
 */
export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.NETLIFY_DB_URL || undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: getDatabaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
