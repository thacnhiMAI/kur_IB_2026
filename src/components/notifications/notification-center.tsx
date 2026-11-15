"use client";

import { Bell, CheckCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getSharedSession } from "@/lib/auth/client-session";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type Payload = {
  ok: boolean;
  authenticated?: boolean;
  unreadCount?: number;
  notifications?: NotificationItem[];
};

export function NotificationCenter() {
  const pathname = usePathname();
  const router = useRouter();
  const rootRef = useRef<HTMLDetailsElement | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh(signal?: AbortSignal) {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store", signal });
      if (response.status === 401) {
        setAuthenticated(false);
        setItems([]);
        setUnread(0);
        return;
      }
      const payload = (await response.json()) as Payload;
      if (!payload.ok) return;
      setAuthenticated(true);
      setItems(payload.notifications ?? []);
      setUnread(payload.unreadCount ?? 0);
    } catch {
      // Notification polling should never interrupt navigation.
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    let timer: number | undefined;
    const onFocus = () => {
      void getSharedSession().then((session) => {
        if (controller.signal.aborted) return;
        if (!session?.user?.id || session.user.accessBlocked) {
          window.clearInterval(timer);
          timer = undefined;
          setAuthenticated(false);
          setItems([]);
          setUnread(0);
          return;
        }
        void refresh(controller.signal);
        timer ??= window.setInterval(() => void refresh(controller.signal), 30000);
      });
    };
    onFocus();
    window.addEventListener("focus", onFocus);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname]);

  async function markRead(item: NotificationItem) {
    if (!item.readAt) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
      setUnread((value) => Math.max(0, value - 1));
      void fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id })
      });
    }

    rootRef.current?.removeAttribute("open");
    if (item.href) router.push(item.href);
  }

  async function markAll() {
    setLoading(true);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true })
      });
      const now = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now })));
      setUnread(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <details ref={rootRef} className="notification-center group relative">
      <summary
        className="dashboard-header-icon-button relative list-none cursor-pointer"
        aria-label="Уведомления"
        title="Уведомления"
        onClick={() => { if (authenticated) void refresh(); }}
      >
        <Bell size={19} />
        {unread > 0 ? (
          <span className="notification-badge" aria-label={`${unread} непрочитанных`}>{unread > 99 ? "99+" : unread}</span>
        ) : null}
      </summary>

      <div className="notification-popover">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--surface-border)] px-4 py-3">
          <div>
            <p className="font-semibold text-[var(--text-primary)]">Уведомления</p>
            <p className="text-xs text-[var(--text-muted)]">{unread > 0 ? `${unread} непрочитанных` : "Всё прочитано"}</p>
          </div>
          {authenticated && items.length > 0 ? (
            <button type="button" onClick={() => void markAll()} disabled={loading || unread === 0} className="notification-mark-all" title="Отметить всё прочитанным">
              <CheckCheck size={17} />
            </button>
          ) : null}
        </div>

        <div className="notification-list">
          {authenticated === false ? (
            <div className="p-5 text-sm leading-6 text-[var(--text-secondary)]">Войдите в аккаунт, чтобы получать уведомления.</div>
          ) : items.length === 0 ? (
            <div className="p-5 text-sm text-[var(--text-muted)]">Новых уведомлений пока нет.</div>
          ) : (
            items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => void markRead(item)}
                className={`notification-item ${item.readAt ? "is-read" : "is-unread"}`}
              >
                <span className="notification-dot" />
                <span className="min-w-0 text-left">
                  <span className="block text-sm font-semibold text-[var(--text-primary)]">{item.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">{item.body}</span>
                  <span className="mt-2 block text-[11px] text-[var(--text-muted)]">{new Date(item.createdAt).toLocaleString("ru-RU")}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </details>
  );
}
