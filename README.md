# TimeClock

Employee punch in / punch out web app. Employees sign in to clock in and out. Only admins can view, edit, and export time records.

**Stack (all free tiers):** Next.js 15 · Prisma · Neon PostgreSQL · Netlify hosting.

## Local setup

1. **Install dependencies** (Node 20+)

   ```bash
   npm install
   ```

2. **Create a free Neon project**
   - Sign up at [neon.tech](https://neon.tech) (free plan).
   - Create a project, then create a branch named **`dev`** for local work so you never touch production data.
   - From the `dev` branch connection details, copy:
     - **Pooled** connection string → `DATABASE_URL` (host usually contains `-pooler`)
     - **Direct** (non-pooled) connection string → `DIRECT_URL`
   - Tip: after claiming or creating the project, keep production on Neon `main` and local work on `dev`.

3. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Fill in `DATABASE_URL`, `DIRECT_URL`, and generate a session secret:

   ```bash
   # macOS / Linux
   openssl rand -base64 32

   # Windows (PowerShell)
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

   Set `SESSION_SECRET` (32+ chars) and `ADMIN_PASSWORD` (12+ chars) in `.env`.

4. **Migrate and seed**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and sign in with the admin credentials from `.env`.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` + `migrate deploy` + `next build` |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate` | Create/apply migrations (`prisma migrate dev`) |
| `npm run db:seed` | Seed admin + default settings |
| `npm run db:studio` | Prisma Studio |
| `npm run audit` | Production dependency audit (high+) |

## Deploy free on Netlify

1. Push this repo to a **private** GitHub repository.
2. In Netlify: **Add new site → Import from GitHub** → select the repo. Build settings come from `netlify.toml` (Node 20, `npm run build`).
3. In **Site configuration → Environment variables**, add (mark as secret):
   - `DATABASE_URL` and `DIRECT_URL` from Neon **`main`** (not `dev`)
   - `SESSION_SECRET` (new value, different from local)
   - `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME`
4. Deploy. Then seed production **once** by temporarily pointing a local shell at the production URLs:

   ```bash
   # Use production Neon main URLs only for this command, then remove them from local .env
   npm run db:seed
   ```

5. Log in as admin and **change the password immediately**.
6. Netlify provides free HTTPS. Session cookies are `secure` when `NODE_ENV=production`.

## GitHub security setup

- `.gitignore` ignores `.env` (keeps `.env.example`).
- Husky pre-commit runs **secretlint**, ESLint, and `tsc` on staged files.
- CI (`.github/workflows/ci.yml`) runs typecheck, lint, audit, Prisma validate, Next build (dummy env only), and **gitleaks**.
- Dependabot updates npm and GitHub Actions weekly.
- See `SECURITY.md` if a secret is ever committed — rotate first, then purge history.

## Back up data

Use **Admin → Time Entries → Export CSV** for the filtered date range. Store the CSV securely; this is the free backup path (no paid storage integrations).

## License

Private application — all rights reserved by the repository owner.
