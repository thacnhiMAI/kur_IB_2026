# Vercel Deploy Guide

## Goal

Deploy the Smart Library frontend and server runtime to Vercel while keeping PostgreSQL self-managed.

## Required Environment Variables

- `DATABASE_URL` - Production PostgreSQL connection string reachable from Vercel.
- `AUTH_SECRET` - Auth.js signing secret.
- `NEXTAUTH_URL` - Canonical production URL for callbacks and generated links.

## What Can Be Created Locally

- `AUTH_SECRET` can be generated locally on Windows with `scripts/phase-e/init-production-env.ps1`.
- `.env.production.local` can be created locally as a private template file on this machine.

## What Must Come From Real Infrastructure

- `DATABASE_URL` must come from the real PostgreSQL instance that Vercel will use.
- `NEXTAUTH_URL` must be the real public production domain.
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` are only needed for CLI or CI deployment, not for deploying through the Vercel web dashboard.

## Optional Environment Variables

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `AI_PROVIDER`
- `OPENAI_API_KEY`
- `GIGACHAT_CLIENT_ID`
- `GIGACHAT_CLIENT_SECRET`
- `VERCEL_PROJECT_PRODUCTION_URL` - optional fallback only. On Vercel, prefer the built-in system environment variable instead of creating it manually. If you set it outside Vercel, use only the host name, for example `smart-library.example`, without `https://`.

## Deployment Steps

1. Run `powershell -ExecutionPolicy Bypass -File .\scripts\phase-e\init-production-env.ps1` to generate a private local template with `AUTH_SECRET`.
2. Prepare a PostgreSQL instance reachable from Vercel.
3. Fill `DATABASE_URL` and `NEXTAUTH_URL` in `.env.production.local` with the real production values.
4. Set `DATABASE_URL`, `AUTH_SECRET`, and `NEXTAUTH_URL` in the Vercel project settings.
5. For the assessment deployment, set `AI_PROVIDER=openai`, `OPENAI_API_KEY`, `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `CRON_SECRET`. Configure Google OAuth and SMTP if those flows are part of the demo.
6. Run `npx tsx scripts/phase-e/check-env.ts` in a shell that has the planned production env values exported.
7. If Google OAuth is enabled, add `https://<your-domain>/api/auth/callback/google` as an authorized redirect URI.
8. Run `npm run db:deploy` against the production database before the first public launch.
9. In Settings → Git, connect the GitHub repository and set the production branch to `main`. The Next.js build command in `vercel.json` generates Prisma Client before building. Confirm the public domain matches `NEXTAUTH_URL`.
10. Verify that the next push to `main` creates a production deployment for that commit. For schema changes, apply migrations to the intended database before promoting the application that depends on them.
11. Test a fresh push subscription and publish a test book. Vercel Cron retries queued events once per day using `CRON_SECRET`. Subscriptions must exist before publication.
12. Re-run Lighthouse against the production HTTPS domain. Test camera AR on a supported device and push with the app tab closed.

## Notes

- The runtime already resolves site URLs with the order `NEXTAUTH_URL -> VERCEL_PROJECT_PRODUCTION_URL -> VERCEL_URL -> localhost`.
- `NEXTAUTH_URL` should be a full origin such as `https://smart-library.example`.
- `VERCEL_PROJECT_PRODUCTION_URL` and `VERCEL_URL` are host names only and should not include the `https://` scheme.
- Recommendations continue to work through the fallback strategy when external AI credentials are not configured.
- Keep local Docker variables only in local `.env` files; do not copy local container assumptions into production.
