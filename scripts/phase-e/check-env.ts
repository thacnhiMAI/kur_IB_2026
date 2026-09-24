import { REQUIRED_VERCEL_ENV, getOptionalAiEnv } from "../../src/lib/site/deploy-env";

const missing = REQUIRED_VERCEL_ENV.filter((entry) => !process.env[entry.key]);

if (missing.length > 0) {
  console.error("Missing required Vercel env values:");

  for (const entry of missing) {
    console.error(`- ${entry.key}: ${entry.description}`);
  }

  process.exit(1);
}

console.log("Required Vercel env values are present.");
console.log(`Optional AI env: ${getOptionalAiEnv().join(", ")}`);
