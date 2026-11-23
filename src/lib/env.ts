import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (v) => v.startsWith("postgresql://") || v.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string"
    ),
  DIRECT_URL: z
    .string()
    .min(1, "DIRECT_URL is required")
    .refine(
      (v) => v.startsWith("postgresql://") || v.startsWith("postgres://"),
      "DIRECT_URL must be a PostgreSQL connection string"
    ),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
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
 */
export function getEnv(): AppEnv {
  if (cached) return cached;

  const result = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
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

  cached = result.data;
  return cached;
}

export function assertEnv(): void {
  getEnv();
}
