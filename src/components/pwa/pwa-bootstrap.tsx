"use client";

import { useEffect } from "react";

export function PwaBootstrap() {
  useEffect(() => {
    void (async () => {
      if (!("serviceWorker" in navigator)) {
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const cacheKeys = await window.caches.keys();
          await Promise.all(
            cacheKeys
              .filter((key) => key.startsWith("smart-library-"))
              .map((key) => window.caches.delete(key))
          );
        }

        return;
      }

      await navigator.serviceWorker.register("/sw.js");
    })().catch(() => undefined);
  }, []);

  return null;
}
