# Debug Session: phase-b-e2e-auth

- Status: OPEN
- Started: 2026-09-24
- Symptom: `npm run test:e2e:phase-b` fails while `npm run verify:phase-b` passes.
- Observed errors:
  - Missing `.next/server/app-paths-manifest.json`
  - Missing module `./341.js`
  - Credentials sign-in remains on `/auth/sign-in`
- Hypotheses:
  1. Playwright webServer startup mode and app runtime artifacts are inconsistent.
  2. Auth base URL / host mismatch prevents session persistence after sign-in.
  3. E2E credentials or seeded user state is missing in the test environment.
  4. A stale `.next` cache or reused server process is causing broken runtime chunks.

## Evidence Log

- Reproduced current packaged command with exact env:
  - `npm run test:e2e:phase-b` -> passed
- Reproduced direct Playwright invocation with explicit env:
  - `PLAYWRIGHT_HOST=127.0.0.1`
  - `PLAYWRIGHT_PORT=3001`
  - `NEXTAUTH_URL=http://127.0.0.1:3001`
  - Result -> passed
- Stability check:
  - Ran the same E2E spec 3 consecutive times
  - Result -> 3/3 passed
- Full verification:
  - `npm run verify:phase-b` -> passed
  - Remaining output is limited to two existing `@next/next/no-img-element` warnings

## Changes

- None yet. Investigation only.
