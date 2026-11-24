import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    console.log("login_e2e=FAIL no_user");
    process.exit(1);
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  console.log(`login_e2e=${ok ? "PASS" : "FAIL"}`);
  console.log(`user_role=${user.role}`);
  console.log(`user_active=${user.active}`);
  console.log(`user_count=${await prisma.user.count()}`);

  const healthRes = await fetch("http://localhost:3000/api/health");
  const health = await healthRes.json();
  console.log(`health_http=${healthRes.status}`);
  console.log(`health_ok=${health.ok}`);
  console.log(`postgres_ok=${health.postgres?.ok}`);
  console.log(`auth_ok=${health.auth?.ok}`);

  if (process.env.NEON_AUTH_JWKS_URL) {
    const jwksRes = await fetch(process.env.NEON_AUTH_JWKS_URL);
    const jwks = await jwksRes.json();
    console.log(`jwks_http=${jwksRes.status}`);
    console.log(`jwks_keys=${Array.isArray(jwks.keys) ? jwks.keys.length : 0}`);
  }

  if (!ok || !health.ok) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
