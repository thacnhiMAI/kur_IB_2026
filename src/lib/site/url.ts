export type UrlEnv = {
  NEXTAUTH_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_URL?: string;
};

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function normalizeVercelOrigin(value: string) {
  return `https://${normalizeOrigin(value).replace(/^https?:\/\//, "")}`;
}

export function getBaseUrl(env?: UrlEnv) {
  const source = env ?? process.env;

  if (source.NEXTAUTH_URL) {
    return normalizeOrigin(source.NEXTAUTH_URL);
  }

  if (source.VERCEL_PROJECT_PRODUCTION_URL) {
    return normalizeVercelOrigin(source.VERCEL_PROJECT_PRODUCTION_URL);
  }

  if (source.VERCEL_URL) {
    return normalizeVercelOrigin(source.VERCEL_URL);
  }

  return "http://localhost:3000";
}

export function resolveSiteUrl(path: string, baseUrl = getBaseUrl()) {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  return new URL(path, normalizedBaseUrl).toString();
}
