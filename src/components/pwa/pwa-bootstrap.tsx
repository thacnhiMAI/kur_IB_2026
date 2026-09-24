"use client";

import { useEffect } from "react";

export function PwaBootstrap() {
  useEffect(() => {
    void navigator.serviceWorker?.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
}
