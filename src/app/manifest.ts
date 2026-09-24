import type { MetadataRoute } from "next";

import { SITE_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME } from "@/lib/site/metadata";
import { getBaseUrl, resolveSiteUrl } from "@/lib/site/url";

export default function manifest(): MetadataRoute.Manifest {
  const baseUrl = getBaseUrl();

  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: resolveSiteUrl("/", baseUrl),
    display: "standalone",
    background_color: "#020617",
    theme_color: "#0f172a",
    icons: [
      {
        src: resolveSiteUrl("/icons/icon-192.png", baseUrl),
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: resolveSiteUrl("/icons/icon-512.png", baseUrl),
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
