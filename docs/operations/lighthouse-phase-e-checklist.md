# Phase E Lighthouse Checklist

## Target Routes

- `/`
- `/catalog`
- `/books/design-of-everyday-things`

## Target Scores

- Performance >= 90
- Accessibility high, no obvious blocking issues
- Best Practices high
- SEO high for public routes

## Manual Capture Steps

1. Prefer a production audit: run `npm run build`, then `NEXTAUTH_URL=http://127.0.0.1:3002 npm run start -- --hostname 127.0.0.1 --port 3002`.
2. Open Chrome DevTools Lighthouse or run `npx lighthouse http://127.0.0.1:3002/catalog --only-categories=performance,accessibility,best-practices,seo`.
3. Record the score and the top three regressions for each route.
4. Update `docs/operations/phase-e-route-audit.md` with before/after notes.

## Windows Note

- On this workstation, Lighthouse needed `CHROME_PATH` pointed at Microsoft Edge because Chrome was not installed in the default location.
- Lighthouse JSON reports were still generated successfully even when the CLI ended with a Windows temp-folder cleanup `EPERM` during shutdown.
