"use client";

import { useEffect, useId, useRef, useState } from "react";

type UsageWindow = { used: number; limit: number; resetsAt: string | null };
type Usage = { short: UsageWindow; week: UsageWindow };

function remaining({ used, limit, resetsAt }: UsageWindow) {
  if (resetsAt && Date.parse(resetsAt) <= Date.now()) return 100;
  return Math.max(0, Math.floor((limit - used) * 100 / limit));
}

const resetFormat = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" });

export function AiUsageMenu() {
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [usage, setUsage] = useState<Usage>();
  const [failed, setFailed] = useState(false);
  const open = pinned || hovered;

  useEffect(() => {
    let request: AbortController | undefined;
    async function refresh() {
      request?.abort();
      const current = new AbortController();
      request = current;
      try {
        const response = await fetch("/api/reader-ai/usage", { cache: "no-store", signal: current.signal });
        if (!response.ok) throw new Error("Usage unavailable");
        const data: Usage = await response.json();
        if (current.signal.aborted) return;
        setUsage(data);
        setFailed(false);
      } catch {
        if (!current.signal.aborted) {
          setFailed(true);
        }
      }
    }
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    function close() {
      setPinned(false);
      setHovered(false);
    }
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) close();
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      close();
      if (root.current?.contains(document.activeElement)) trigger.current?.focus();
    }
    window.addEventListener("reader-ai-usage-updated", refresh);
    let refreshTimer: number | undefined;
    if (open) {
      void refresh();
      refreshTimer = window.setInterval(refreshWhenVisible, 15_000);
      document.addEventListener("visibilitychange", refreshWhenVisible);
      document.addEventListener("pointerdown", dismiss);
      document.addEventListener("keydown", escape);
    }
    return () => {
      request?.abort();
      window.clearInterval(refreshTimer);
      window.removeEventListener("reader-ai-usage-updated", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const arc = usage ? Math.min(remaining(usage.short), remaining(usage.week)) : 80;

  return (
    <div
      className="dashboard-ai-usage"
      ref={root}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
    >
      <button
        ref={trigger}
        type="button"
        className="dashboard-ai-usage-trigger"
        aria-label="Использование AI"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          setFailed(false);
          setPinned(!pinned);
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" opacity=".2" />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
            pathLength="100" strokeDasharray={`${arc} 100`} transform="rotate(-90 12 12)" opacity={arc ? 1 : 0} />
          <path d="m12 8 4 4-4 4-4-4Z" fill="currentColor" opacity=".4" />
        </svg>
      </button>

      {open && (
        <section id={panelId} className="dashboard-ai-usage-panel" aria-label="Использование AI">
          {usage ? ([["5 часов", usage.short], ["7 дней", usage.week]] as const).map(([label, period]) => (
            <div className="dashboard-ai-usage-row" tabIndex={0} key={label}>
              <span>{label}</span>
              <span>Осталось {remaining(period)}%</span>
              <small className="dashboard-ai-usage-reset">
                {period.resetsAt && Date.parse(period.resetsAt) > Date.now() ? (
                  <>Сброс <time dateTime={period.resetsAt}>{resetFormat.format(new Date(period.resetsAt))}</time></>
                ) : "Период начнётся с первого запроса"}
              </small>
            </div>
          )) : (
            <p className="dashboard-ai-usage-status" role="status">{failed ? "Не удалось загрузить данные" : "Загрузка…"}</p>
          )}
        </section>
      )}
    </div>
  );
}
