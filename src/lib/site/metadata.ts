import type { Metadata } from "next";

import { getBaseUrl, resolveSiteUrl } from "@/lib/site/url";

export const SITE_NAME = "Умная библиотека";
export const SITE_SHORT_NAME = "Библиотека";
export const SITE_DESCRIPTION =
  "Каталог книг с персональными рекомендациями, AR-превью, голосовым поиском и PWA.";

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  baseUrl?: string;
  noIndex?: boolean;
};

type BookMetadataOptions = PageMetadataOptions & {
  imagePath?: string | null;
};

function buildRobots(noIndex: boolean): Metadata["robots"] | undefined {
  if (!noIndex) {
    return undefined;
  }

  return {
    index: false,
    follow: false
  };
}

export function buildRootMetadata(baseUrl = getBaseUrl()): Metadata {
  const canonical = resolveSiteUrl("/", baseUrl);

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: SITE_NAME,
      template: `%s | ${SITE_NAME}`
    },
    description: SITE_DESCRIPTION,
    alternates: {
      canonical
    },
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
      ],
      apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "ru_RU",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      url: canonical
    }
  };
}

export function buildPageMetadata({
  title,
  description,
  path,
  baseUrl = getBaseUrl(),
  noIndex = false
}: PageMetadataOptions): Metadata {
  const canonical = resolveSiteUrl(path, baseUrl);

  return {
    title,
    description,
    alternates: {
      canonical
    },
    robots: buildRobots(noIndex),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "ru_RU",
      title,
      description,
      url: canonical
    }
  };
}

export function buildBookMetadata({
  title,
  description,
  path,
  imagePath,
  baseUrl = getBaseUrl(),
  noIndex = false
}: BookMetadataOptions): Metadata {
  const canonical = resolveSiteUrl(path, baseUrl);
  const imageUrl = imagePath ? resolveSiteUrl(imagePath, baseUrl) : undefined;

  return {
    title,
    description,
    alternates: {
      canonical
    },
    robots: buildRobots(noIndex),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "ru_RU",
      title,
      description,
      url: canonical,
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: title
            }
          ]
        : undefined
    }
  };
}
