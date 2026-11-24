import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Postgres is always on; Auth = Managed Better Auth on this branch
  auth: true,
  branch: (branch) => {
    if (branch.isDefault) {
      return {};
    }
    if (!branch.exists) {
      // Non-default branches (e.g. `neon checkout dev --create`) auto-expire
      return { ttl: "7d" };
    }
    return {};
  },
});
