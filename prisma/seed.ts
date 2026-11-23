import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME || "Administrator";

  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD is required. Set it in .env before running db:seed."
    );
  }

  if (password.length < 12) {
    throw new Error(
      "ADMIN_PASSWORD must be at least 12 characters."
    );
  }

  const existing = await prisma.user.findUnique({ where: { username } });

  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        username,
        fullName,
        passwordHash,
        role: Role.ADMIN,
        active: true,
        mustChangePassword: false,
        sessionVersion: 0,
      },
    });
  } else {
    await prisma.user.update({
      where: { username },
      data: {
        fullName,
        role: Role.ADMIN,
        active: true,
      },
    });
  }

  const defaults: Record<string, string> = {
    timezone: "America/New_York",
    kioskAutoLogout: "true",
    businessName: "TimeClock",
  };

  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  console.log(`Seed complete. Admin user: ${username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
