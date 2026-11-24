import { defineConfig } from "prisma/config";

// With a config file present, the Prisma CLI no longer loads `.env` on its own.
// Load it here for local development; it's a no-op on Netlify (no .env file).
try {
  process.loadEnvFile();
} catch {
  // No .env file present
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    // Netlify Database applies migrations from this folder on every deploy.
    // `prisma migrate dev` writes new migrations here too.
    path: "netlify/database/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
