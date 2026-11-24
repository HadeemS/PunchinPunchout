import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

let bootstrapPromise: Promise<void> | null = null;

async function createInitialAdmin(): Promise<void> {
  const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
  if (adminCount > 0) return;

  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12) {
    console.warn(
      "No admin account exists and ADMIN_PASSWORD is missing or shorter than 12 characters; skipping admin bootstrap."
    );
    return;
  }

  const username = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const fullName = process.env.ADMIN_FULL_NAME || "Administrator";

  try {
    await prisma.user.create({
      data: {
        username,
        fullName,
        passwordHash: await hashPassword(password),
        role: Role.ADMIN,
        active: true,
        // The bootstrap password lives in an env var, so force a change on first login.
        mustChangePassword: true,
        sessionVersion: 0,
      },
    });
    console.log(`Bootstrapped initial admin user: ${username}`);
  } catch (err) {
    // Another instance created it concurrently — that's fine.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return;
    }
    throw err;
  }
}

/**
 * Creates the first admin from ADMIN_USERNAME / ADMIN_PASSWORD when the
 * database has no admin yet (e.g. a fresh Netlify Database). Runs at most
 * once per server instance; a failure is retried on the next call.
 */
export function ensureInitialAdmin(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = createInitialAdmin().catch((err) => {
      bootstrapPromise = null;
      throw err;
    });
  }
  return bootstrapPromise;
}
