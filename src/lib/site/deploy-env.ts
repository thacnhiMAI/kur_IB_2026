export const REQUIRED_VERCEL_ENV = [
  {
    key: "DATABASE_URL",
    description: "Production PostgreSQL connection string reachable from Vercel."
  },
  {
    key: "AUTH_SECRET",
    description: "Auth.js signing secret."
  },
  {
    key: "NEXTAUTH_URL",
    description: "Canonical production URL for callbacks and generated links."
  }
] as const;

export function getOptionalAiEnv() {
  return [
    "AI_PROVIDER",
    "OPENAI_API_KEY",
    "GIGACHAT_CLIENT_ID",
    "GIGACHAT_CLIENT_SECRET"
  ];
}
