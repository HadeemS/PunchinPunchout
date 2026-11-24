import { z } from "zod";

const postgresUrl = z
  .string()
  .min(1)
  .refine(
    (v) => v.startsWith("postgresql://") || v.startsWith("postgres://"),
    "Must be a PostgreSQL connection string"
  );

const envSchema = z.object({
  /** App runtime connection — DATABASE_URL locally, NETLIFY_DB_URL on Netlify */
  DATABASE_URL: postgresUrl,
  /** Prisma Migrate (local only) — direct (non-pooled) URL. Netlify applies migrations itself. */
  DIRECT_URL: postgresUrl.optional(),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  /** Neon Auth (Managed Better Auth) — provisioned; TimeClock login stays custom JWT */
  NEON_AUTH_BASE_URL: z.string().url().optional(),
  NEON_AUTH_JWKS_URL: z.string().url().optional(),
  NEON_BRANCH: z.string().optional(),
  NEON_BRANCH_ID: z.string().optional(),
  ADMIN_USERNAME: z.string().min(1).optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_FULL_NAME: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .optional()
    .default("development"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

/**
 * Validates required environment variables. Never logs secret values.
 * Maps Neon’s DATABASE_URL_UNPOOLED → DIRECT_URL when DIRECT_URL is unset.
 * Falls back to Netlify Database’s NETLIFY_DB_URL when DATABASE_URL is unset.
 */
export function getEnv(): AppEnv {
  if (cached) return cached;

  const databaseUrl =
    process.env.DATABASE_URL || process.env.NETLIFY_DB_URL || "";
  const directUrl =
    process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || undefined;

  const result = envSchema.safeParse({
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
    SESSION_SECRET: process.env.SESSION_SECRET,
    NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL || undefined,
    NEON_AUTH_JWKS_URL: process.env.NEON_AUTH_JWKS_URL || undefined,
    NEON_BRANCH: process.env.NEON_BRANCH || undefined,
    NEON_BRANCH_ID: process.env.NEON_BRANCH_ID || undefined,
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    ADMIN_FULL_NAME: process.env.ADMIN_FULL_NAME,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!result.success) {
    const missing = result.error.issues.map((issue) => {
      const path = issue.path.join(".") || "unknown";
      return `${path}: ${issue.message}`;
    });
    throw new Error(
      `Invalid environment configuration:\n- ${missing.join("\n- ")}`
    );
  }

  // Ensure Prisma always sees DIRECT_URL even when only UNPOOLED was set
  if (!process.env.DIRECT_URL && process.env.DATABASE_URL_UNPOOLED) {
    process.env.DIRECT_URL = process.env.DATABASE_URL_UNPOOLED;
  }

  cached = result.data;
  return cached;
}

export function assertEnv(): void {
  getEnv();
}
