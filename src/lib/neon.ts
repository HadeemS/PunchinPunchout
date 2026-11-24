import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/db";

export type NeonHealth = {
  postgres: { ok: boolean; error?: string };
  auth: { ok: boolean; configured: boolean; error?: string };
  branch?: string;
};

/**
 * Neon wiring helpers.
 * - Postgres: Prisma uses pooled DATABASE_URL + direct DIRECT_URL / DATABASE_URL_UNPOOLED
 * - Auth: Managed Better Auth is provisioned on the branch; employee punch auth remains
 *   the app’s custom JWT sessions (admin-created usernames, no public sign-up).
 */
export async function checkNeonHealth(): Promise<NeonHealth> {
  const env = getEnv();
  const result: NeonHealth = {
    postgres: { ok: false },
    auth: { ok: false, configured: false },
    branch: env.NEON_BRANCH,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    result.postgres = { ok: true };
  } catch (err) {
    result.postgres = {
      ok: false,
      error: err instanceof Error ? err.message : "Postgres check failed",
    };
  }

  const jwksUrl = env.NEON_AUTH_JWKS_URL;
  if (!jwksUrl) {
    result.auth = {
      ok: false,
      configured: false,
      error: "NEON_AUTH_JWKS_URL is not set",
    };
    return result;
  }

  result.auth.configured = true;
  try {
    const res = await fetch(jwksUrl, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      result.auth = {
        ok: false,
        configured: true,
        error: `JWKS HTTP ${res.status}`,
      };
      return result;
    }
    const body = (await res.json()) as { keys?: unknown[] };
    if (!Array.isArray(body.keys)) {
      result.auth = {
        ok: false,
        configured: true,
        error: "JWKS response missing keys array",
      };
      return result;
    }
    result.auth = { ok: true, configured: true };
  } catch (err) {
    result.auth = {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : "JWKS fetch failed",
    };
  }

  return result;
}
