"use client";

import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  LoaderCircle,
  MessageSquarePlus,
  Plus,
  Send,
  Square,
  Trash2,
  X
} from "lucide-react";
import * as katex from "katex";
import Image from "next/image";
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";

export type ReaderAiScope = "page" | "document";
type ReaderAiAction = "summary" | "explain" | "questions" | "ask";
type Message = { id: string; role: string; content: string; createdAt: string };
type Conversation = {
  id: string;
  scope: ReaderAiScope;
  page: number | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};
type JobState = { jobId: string; status: "running" | "done" | "error" };
type Toast = { id: string; text: string };

const WIDTH_KEY = "smart-library:reader-ai-rail-width:v1";

function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function normalizeMathDelimiters(content: string) {
  return content
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$")
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$");
}

function LatexMessage({ content }: { content: string }) {
  const normalized = normalizeMathDelimiters(content);
  const chunks = normalized.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g).filter(Boolean);

  return (
    <>
      {chunks.map((chunk, index) => {
        const display = chunk.startsWith("$$") && chunk.endsWith("$$");
        const inline = !display && chunk.startsWith("$") && chunk.endsWith("$");
        if (!display && !inline) return <span key={index}>{chunk}</span>;

        const expression = chunk.slice(display ? 2 : 1, display ? -2 : -1).trim();
        if (!expression) return <span key={index}>{chunk}</span>;
        const html = katex.renderToString(expression, {
          displayMode: display,
          throwOnError: false,
          strict: "ignore",
          trust: false,
          output: "html"
        });
        return display
          ? <div key={index} className="reader-ai-math-block" dangerouslySetInnerHTML={{ __html: html }} />
          : <span key={index} className="reader-ai-math-inline" dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </>
  );
}

export function ReaderAiPanel({
  open,
  title,
  bookId,
  contentId,
  page,
  lastVisiblePage,
  getText,
  getPageImage,
  onClose,
  onWidthChange
}: {
  open: boolean;
  title: string;
  bookId: string;
  contentId: string | null;
  page: number;
  lastVisiblePage: number;
  getText: (scope: ReaderAiScope, page?: number) => Promise<string>;
  getPageImage: (page: number) => Promise<File>;
  onClose: () => void;
  onWidthChange: (width: number) => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string>("document");
  const [question, setQuestion] = useState("");
  const [usePageImage, setUsePageImage] = useState(false);
  const [illustration, setIllustration] = useState<{ conversationId: string; src: string } | null>(null);
  const [error, setError] = useState("");
  const [width, setWidth] = useState(340);
  const [jobs, setJobs] = useState<Record<string, JobState>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const resizeRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);
  const controllersRef = useRef(new Map<string, AbortController>());

  const active = useMemo(() => conversations.find((item) => item.id === activeId) ?? null, [conversations, activeId]);
  const activeJob = active ? jobs[active.id] : undefined;
  const activeRunning = activeJob?.status === "running";

  const pageGroups = useMemo(() => {
    const groups = new Map<number, Conversation[]>();
    for (const item of conversations) {
      if (item.scope !== "page" || !item.page) continue;
      const list = groups.get(item.page) ?? [];
      list.push(item);
      groups.set(item.page, list);
    }
    for (let visiblePage = page; visiblePage <= lastVisiblePage; visiblePage++) {
      if (!groups.has(visiblePage)) groups.set(visiblePage, []);
    }
    return [...groups.entries()]
      .map(([pageNumber, items]) => ({
        page: pageNumber,
        visible: pageNumber >= page && pageNumber <= lastVisiblePage,
        items: items.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
        updatedAt: items[0]?.updatedAt ?? "1970-01-01"
      }))
      .sort((a, b) => {
        if (a.visible && b.visible) return a.page - b.page;
        return Number(b.visible) - Number(a.visible) || +new Date(b.updatedAt) - +new Date(a.updatedAt);
      });
  }, [conversations, page, lastVisiblePage]);

  const documentConversations = useMemo(
    () => conversations.filter((item) => item.scope === "document").sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)),
    [conversations]
  );

  async function load() {
    const response = await fetch(`/api/reader-ai/conversations?bookId=${encodeURIComponent(bookId)}`, { cache: "no-store" });
    if (!response.ok) return;
    const result = await response.json() as { ok?: boolean; conversations?: Conversation[] };
    if (result.ok) setConversations(result.conversations ?? []);
  }

  useEffect(() => {
    if (!open) {
      setActiveId(null);
      return;
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bookId]);

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(WIDTH_KEY));
      if (Number.isFinite(saved) && saved >= 270 && saved <= 520) setWidth(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (open) onWidthChange(width);
  }, [open, width, onWidthChange]);

  useEffect(() => () => {
    for (const controller of controllersRef.current.values()) controller.abort();
  }, []);

  function showToast(text: string) {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, text }].slice(-4));
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 8000);
  }

  async function createConversation(scope: ReaderAiScope, pageNumber?: number) {
    const response = await fetch("/api/reader-ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, contentId, scope, page: scope === "page" ? pageNumber ?? page : undefined })
    });
    const result = await response.json();
    if (!response.ok || !result.ok || !result.conversation) return;
    setConversations((current) => [result.conversation, ...current]);
    setActiveId(result.conversation.id);
  }

  async function removeConversation(id: string) {
    const running = jobs[id];
    if (running?.status === "running") await stopJob(id);
    const response = await fetch(`/api/reader-ai/conversations?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) return;
    setConversations((current) => current.filter((item) => item.id !== id));
    setJobs((current) => { const next = { ...current }; delete next[id]; return next; });
    if (activeId === id) setActiveId(null);
  }

  async function stopJob(conversationId: string) {
    const job = jobs[conversationId];
    if (!job || job.status !== "running") return;
    controllersRef.current.get(conversationId)?.abort();
    controllersRef.current.delete(conversationId);
    void fetch("/api/reader-ai/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.jobId })
    }).catch(() => undefined);
    setJobs((current) => { const next = { ...current }; delete next[conversationId]; return next; });
  }

  async function run(action: ReaderAiAction, output: "text" | "image" = "text") {
    if (!active || jobs[active.id]?.status === "running") return;
    setError("");
    const conversation = active;
    const userContent = action === "ask"
      ? question.trim()
      : action === "summary"
        ? "Кратко перескажи этот материал."
        : action === "explain"
          ? "Объясни этот материал простыми словами."
          : "Составь вопросы для самопроверки.";
    if (output === "text" && action === "ask" && !userContent) return;
    const sourcePage = conversation.scope === "page" ? conversation.page : null;
    if (output === "image" && !sourcePage) return;
    const sendImage = Boolean(sourcePage && (usePageImage || output === "image"));

    const jobId = crypto.randomUUID();
    const controller = new AbortController();
    controllersRef.current.set(conversation.id, controller);
    setJobs((current) => ({ ...current, [conversation.id]: { jobId, status: "running" } }));
    const optimisticId = `local-${jobId}`;
    if (output === "text") {
      setConversations((current) => current.map((item) => item.id === conversation.id ? {
        ...item,
        messages: [...item.messages, { id: optimisticId, role: "user", content: userContent, createdAt: new Date().toISOString() }]
      } : item));
    }
    if (action === "ask") setQuestion("");

    try {
      const text = sendImage ? "" : (await getText(conversation.scope, conversation.page ?? undefined)).trim();
      if (!sendImage && !text) throw new Error("В PDF не удалось получить текст.");
      const requestPayload = JSON.stringify({
        action, output, scope: conversation.scope, title, text, bookId, jobId,
        page: sourcePage ?? undefined,
        question: output === "image" ? question.trim() || undefined : action === "ask" ? userContent : undefined,
        conversationId: conversation.id
      });
      const form = sendImage && sourcePage ? new FormData() : null;
      if (form && sourcePage) {
        form.set("image", await getPageImage(sourcePage));
        form.set("payload", requestPayload);
      }
      const response = await fetch("/api/reader-ai", {
        method: "POST",
        headers: form ? undefined : { "Content-Type": "application/json" },
        signal: controller.signal,
        body: form ?? requestPayload
      });
      const payload = await response.json().catch(() => ({})) as { answer?: string; image?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      if (output === "image") {
        if (!payload.image) throw new Error("OpenAI не вернул изображение.");
        setIllustration({ conversationId: conversation.id, src: `data:image/jpeg;base64,${payload.image}` });
      } else {
        if (!payload.answer) throw new Error("AI Reader не вернул ответ.");
        await load();
      }
      setJobs((current) => ({ ...current, [conversation.id]: { jobId, status: "done" } }));
      showToast(`${conversation.scope === "document" ? "PDF" : `Страница ${conversation.page}`}: AI Reader завершил ответ.`);
    } catch (cause) {
      if (controller.signal.aborted || (cause instanceof Error && cause.message === "Cancelled")) {
        setConversations((current) => current.map((item) => item.id === conversation.id
          ? { ...item, messages: item.messages.filter((message) => message.id !== optimisticId) }
          : item));
        setJobs((current) => { const next = { ...current }; delete next[conversation.id]; return next; });
      } else {
        setJobs((current) => ({ ...current, [conversation.id]: { jobId, status: "error" } }));
        setError(cause instanceof Error ? cause.message : "Не удалось получить ответ AI Reader.");
      }
    } finally {
      controllersRef.current.delete(conversation.id);
    }
  }

  function beginResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: width };
  }
  function moveResize(event: ReactPointerEvent<HTMLButtonElement>) {
    const state = resizeRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    setWidth(Math.min(520, Math.max(270, state.startWidth + (state.startX - event.clientX))));
  }
  function endResize(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!resizeRef.current || resizeRef.current.pointerId !== event.pointerId) return;
    resizeRef.current = null;
    try { window.localStorage.setItem(WIDTH_KEY, String(width)); } catch { /* ignore */ }
  }

  const toastStack = (
    <div className="reader-ai-toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="reader-ai-toast"><Check size={16} /><span>{toast.text}</span><button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}><X size={14} /></button></div>
      ))}
    </div>
  );

  if (!open) return toastStack;

  const statusIcon = (conversationId: string) => {
    const state = jobs[conversationId];
    if (state?.status === "running") return <LoaderCircle size={14} className="reader-ai-spin" />;
    if (state?.status === "done") return <Check size={14} className="reader-ai-done" />;
    return <MessageSquarePlus size={14} />;
  };

  const groupButton = (key: string, label: string, items: Conversation[], scope: ReaderAiScope, pageNumber?: number) => (
    <section key={key} className="reader-ai-group">
      <div className="reader-ai-group-head">
        <button type="button" className="reader-ai-group-label" onClick={() => setExpandedGroup((current) => current === key ? "" : key)}>
          {expandedGroup === key ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>{label}</span>
        </button>
        <button type="button" className="reader-ai-icon-button" onClick={() => void createConversation(scope, pageNumber)} title="Новый разговор" aria-label={`Новый разговор: ${label}`}><Plus size={16} /></button>
      </div>
      {expandedGroup === key ? (
        <div className="reader-ai-conversation-list">
          {items.length ? items.map((item, index) => (
            <button key={item.id} type="button" className="reader-ai-conversation-row" onClick={() => setActiveId(item.id)}>
              {statusIcon(item.id)}
              <span>Разговор {items.length - index}</span>
              <time>{timeLabel(item.updatedAt)}</time>
            </button>
          )) : <p className="reader-rail-empty">Разговоров пока нет.</p>}
        </div>
      ) : null}
    </section>
  );

  return (
    <>
      <aside className="reader-ai-rail" style={{ width }} aria-label="AI Reader">
        <button type="button" className="reader-ai-resizer" onPointerDown={beginResize} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize} aria-label="Изменить ширину AI панели" />
        {active ? (
          <div className="reader-ai-chat">
            <header className="reader-ai-chat-header">
              <div><p className="reader-ai-chat-kicker">AI Reader</p><strong>{active.scope === "document" ? "PDF" : `Страница ${active.page}`}</strong></div>
              <div className="reader-ai-chat-actions">
                <button type="button" onClick={() => void createConversation(active.scope, active.page ?? undefined)} title="Новый разговор"><Plus size={16} /></button>
                <button type="button" onClick={() => void removeConversation(active.id)} title="Удалить"><Trash2 size={16} /></button>
                <button type="button" onClick={() => setActiveId(null)} title="Закрыть разговор"><X size={17} /></button>
              </div>
            </header>
            <div className="reader-ai-chat-messages">
              {active.messages.length ? active.messages.map((message) => <div key={message.id} className={`reader-ai-message is-${message.role}`}><LatexMessage content={message.content} /></div>) : <p className="reader-rail-empty">Начните разговор с AI Reader.</p>}
              {illustration?.conversationId === active.id ? (
                <figure className="reader-ai-message is-assistant">
                  <Image src={illustration.src} alt={`Иллюстрация к странице ${active.page}`} width={1024} height={1024} unoptimized className="h-auto max-w-full rounded-lg" />
                  <a href={illustration.src} download={`page-${active.page}-illustration.jpg`} className="underline">Скачать иллюстрацию</a>
                </figure>
              ) : null}
              {activeRunning ? <div className="reader-ai-message is-assistant is-loading"><LoaderCircle size={15} className="reader-ai-spin" /> AI Reader думает…</div> : null}
            </div>
            <div className="reader-ai-quick-actions">
              <button type="button" disabled={activeRunning} onClick={() => void run("summary")}>Кратко</button>
              <button type="button" disabled={activeRunning} onClick={() => void run("explain")}>Объяснить</button>
              <button type="button" disabled={activeRunning} onClick={() => void run("questions")}>Вопросы</button>
              {active.scope === "page" && active.page ? (
                <>
                  <button type="button" disabled={activeRunning} onClick={() => void run("explain", "image")}>Иллюстрация</button>
                  <label className="flex w-full items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <input type="checkbox" checked={usePageImage} onChange={(event) => setUsePageImage(event.target.checked)} disabled={activeRunning} />
                    Отправлять изображение страницы в OpenAI
                  </label>
                </>
              ) : null}
            </div>
            {error ? <p className="reader-ai-error">{error}</p> : null}
            <div className="reader-ai-composer">
              <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} placeholder="Спросить AI Reader…" onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && question.trim() && !activeRunning) { event.preventDefault(); void run("ask"); }
              }} />
              {activeRunning ? (
                <button type="button" className="is-stop" onClick={() => void stopJob(active.id)} title="Остановить"><Square size={15} fill="currentColor" /></button>
              ) : (
                <button type="button" disabled={!question.trim()} onClick={() => void run("ask")} title="Отправить"><Send size={16} /></button>
              )}
            </div>
          </div>
        ) : (
          <div className="reader-ai-index">
            <header className="reader-ai-index-header"><div><FileText size={18} /><strong>AI Reader</strong></div><button type="button" onClick={onClose} title="Скрыть AI"><X size={17} /></button></header>
            {groupButton("document", "PDF", documentConversations, "document")}
            {pageGroups.map((group) => groupButton(`page-${group.page}`, `Страница ${group.page}`, group.items, "page", group.page))}
          </div>
        )}
      </aside>
      {toastStack}
    </>
  );
}
