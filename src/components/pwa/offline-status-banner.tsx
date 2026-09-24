import React from "react";

type OfflineStatusBannerProps = {
  isOffline?: boolean;
  id?: string;
};

export function OfflineStatusBanner({
  isOffline = false,
  id = "offline-status-banner"
}: OfflineStatusBannerProps) {
  return (
    <div
      id={id}
      hidden={!isOffline}
      data-offline-banner
      role="status"
      aria-live="polite"
      className="border-b border-amber-400/30 bg-amber-400/10"
    >
      <div className="mx-auto max-w-6xl px-6 py-3 text-sm text-amber-100">
        Вы сейчас офлайн. Доступны сохранённые страницы.
      </div>
    </div>
  );
}
