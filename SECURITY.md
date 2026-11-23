# Security Policy

## Reporting a vulnerability

If you discover a security issue in TimeClock, please open a private GitHub security advisory on this repository (or contact the repository owner directly). Do not open a public issue that includes secrets or exploit details.

## If a secret is ever committed

Deleting the file or removing the line in a later commit is **not enough** — the secret remains in git history.

1. **Rotate immediately**
   - Neon: reset the database password / create new connection strings in the Neon console, then update `DATABASE_URL` and `DIRECT_URL` in Netlify and your local `.env`.
   - Netlify: replace `SESSION_SECRET`, `ADMIN_PASSWORD`, and any other exposed env vars under Site configuration → Environment variables.
   - Change the admin password in the app after redeploying.
2. **Remove the secret from history** (examples): use `git filter-repo` or BFG Repo-Cleaner to purge the sensitive file/string, then force-push only if you understand the impact on collaborators.
3. **Verify** with a full-history scan (for example `gitleaks`) that the secret no longer appears.
4. Treat the old values as compromised forever.

## Local protections

This repository uses:

- `.gitignore` so `.env` is never tracked
- Husky + secretlint on pre-commit to block staged secrets
- GitHub Actions CI with gitleaks on every push/PR to `main`

Never paste real connection strings, passwords, or tokens into README examples, comments, tests, or screenshots.
