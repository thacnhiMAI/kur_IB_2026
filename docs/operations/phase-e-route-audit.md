# Phase E Route Audit

## Routes

| Route | Category | Before notes | After notes | Lighthouse target |
| --- | --- | --- | --- | --- |
| `/` | public | Measure shell cost and metadata completeness. | Lighthouse on `next start` (`127.0.0.1:3002`): Performance `99`, Accessibility `100`, Best Practices `100`, SEO `100`. Shell and metadata are now clean; remaining perf headroom is mostly minor render-blocking CSS and small unused JS savings. | Performance >= 90 |
| `/catalog` | public | Measure card grid image weight and client search hydration. | Lighthouse on `next start` (`127.0.0.1:3002`): Performance `91`, Accessibility `100`, Best Practices `100`, SEO `100`. The Phase E image pass plus labeled filters removed accessibility/runtime noise; the main remaining pressure is catalog LCP around `3.3s` and modest JS/image delivery overhead. | Performance >= 90 |
| `/books/design-of-everyday-things` | public | Measure hero image cost, AR entry overhead, and review block. | Lighthouse on `next start` (`127.0.0.1:3002`): Performance `99`, Accessibility `100`, Best Practices `100`, SEO `100`. Hero image delivery is stable; remaining observations are minor LCP discovery and render-blocking savings, not blocking issues. | Performance >= 90 |
| `/recommendations` | auth | Measure personalized grid cost and dynamic route stability. | Route remains auth-gated by design, so Phase E verification used `npm run test:e2e:phase-e` plus existing recommendation E2E coverage instead of anonymous Lighthouse scoring. Public shell, redirects, and route entry remained stable after metadata/auth hardening. | Stable auth route |
