import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { passwordSchema } from "@/lib/validators";

let bootstrapPromise: Promise<void> | null = null;

async function createInitialAdmin(): Promise<void> {
  const password = process.env.ADMIN_PASSWORD;
  const username = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const fullName = process.env.ADMIN_FULL_NAME || "Administrator";

  const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });

  if (!password || !passwordSchema.safeParse(password).success) {
    if (adminCount === 0) {
      console.warn(
        "No admin account exists and ADMIN_PASSWORD is missing or does not meet the password rules (8+ characters, a letter and a number); skipping admin bootstrap."
      );
    }
    return;
  }

  if (adminCount > 0) {
    await syncStartingPassword(username, password);
    return;
  }

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
 * While the bootstrap admin is still on its starting password (it has never
 * completed the forced password change), keep that password in step with
 * ADMIN_PASSWORD so updating the env var takes effect. Once the admin has
 * chosen their own password, the env var is ignored.
 */
async function syncStartingPassword(
  username: string,
  password: string
): Promise<void> {
  const admin = await prisma.user.findUnique({ where: { username } });
  if (!admin || admin.role !== Role.ADMIN || !admin.mustChangePassword) return;
  if (await verifyPassword(password, admin.passwordHash)) return;

  await prisma.user.update({
    where: { id: admin.id },
    data: {
      passwordHash: await hashPassword(password),
      active: true,
      sessionVersion: { increment: 1 },
    },
  });
  console.log(`Updated starting password for admin user: ${username}`);
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
