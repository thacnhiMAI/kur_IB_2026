import { PHASE_E_PRIORITY_ROUTES } from "../../src/lib/site/phase-e-routes";

console.log("# Phase E Route Baseline");

for (const route of PHASE_E_PRIORITY_ROUTES) {
  console.log(`- ${route.label}: ${route.path} [${route.category}]`);
}
