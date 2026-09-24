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
- `VERCEL_PROJECT_PRODUCTION_URL`

## Deployment Steps

1. Run `powershell -ExecutionPolicy Bypass -File .\scripts\phase-e\init-production-env.ps1` to generate a private local template with `AUTH_SECRET`.
2. Prepare a PostgreSQL instance reachable from Vercel.
3. Fill `DATABASE_URL` and `NEXTAUTH_URL` in `.env.production.local` with the real production values.
4. Set `DATABASE_URL`, `AUTH_SECRET`, and `NEXTAUTH_URL` in the Vercel project settings.
5. Add optional OAuth and AI variables only if those providers should be enabled in production.
6. Run `npx tsx scripts/phase-e/check-env.ts` in a shell that has the planned production env values exported.
7. If Google OAuth is enabled, add `https://<your-domain>/api/auth/callback/google` as an authorized redirect URI.
8. Run `npm run db:deploy` against the production database before the first public launch.
9. Deploy the application on Vercel and confirm the public domain matches `NEXTAUTH_URL`.
10. Redeploy after updating env values or Prisma schema.

## Notes

- The runtime already resolves site URLs with the order `NEXTAUTH_URL -> VERCEL_PROJECT_PRODUCTION_URL -> VERCEL_URL -> localhost`.
- Recommendations continue to work through the fallback strategy when external AI credentials are not configured.
- Keep local Docker variables only in local `.env` files; do not copy local container assumptions into production.
