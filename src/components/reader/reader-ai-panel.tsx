"use client";

import {
  Check,
  Copy,
  ChevronDown,
  ChevronRight,
  FileText,
  LoaderCircle,
  MessageSquarePlus,
  Plus,
  Paperclip,
  Send,
  Square,
  Trash2,
  X
} from "lucide-react";
import { ReaderAnswer } from "@/components/reader/reader-answer";
import Image from "next/image";
import { type ClipboardEvent, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { cancelQueuedReaderJob, waitForReaderJob } from "@/lib/reading/reader-job-client";
import { prepareReaderImage } from "@/lib/reading/page-image";

export type ReaderAiScope = "page" | "document";
type ReaderAiAction = "summary" | "explain" | "questions" | "ask";
type Message = { id: string; role: string; content: string; createdAt: string; image?: File };
type Conversation = {
  id: string;
  scope: ReaderAiScope;
  page: number | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};
type JobState = { jobId: string; conversationId: string; status: "running" | "done" | "error"; startedAt: number; finishedAt?: number; stage?: "preparing" | "submitted" | "queued" | "processing" };
export type ReaderAiAttachment = { page: number; file: File };
type Toast = { id: string; text: string };

const WIDTH_KEY = "smart-library:reader-ai-rail-width:v1";
const IMAGE_COMMAND = /(?:^|\s)#create_immage(?=\s|$)/gi;

function notifyReaderUsage() {
  window.dispatchEvent(new Event("reader-ai-usage-updated"));
}

function SentImage({ file }: { file: File }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const src = URL.createObjectURL(file);
    setUrl(src);
    return () => URL.revokeObjectURL(src);
  }, [file]);
  return url ? <Image src={url} alt="Отправленное вложение" width={192} height={120} unoptimized /> : null;
}

function elapsedLabel(ms: number) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ReaderAiPanel({
  open,
  title,
  bookId,
  contentId,
  page,
  lastVisiblePage,
  getText,
  selectionAttachment,
  onSelectionHandled,
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
  selectionAttachment?: ReaderAiAttachment | null;
  onSelectionHandled?: () => void;
  onClose: () => void;
  onWidthChange: (width: number) => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string>("document");
  const [questions, setQuestions] = useState<Record<string, string>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Record<string, File | undefined>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [composerHeight, setComposerHeight] = useState(48);
  const composerDrag = useRef<{ pointerId: number; startY: number; height: number } | null>(null);
  const [illustration, setIllustration] = useState<{ conversationId: string; src: string } | null>(null);
  const [error, setError] = useState("");
  const [width, setWidth] = useState(340);
  const [jobs, setJobs] = useState<Record<string, JobState>>({});
  const [copiedMessage, setCopiedMessage] = useState<string>();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const resizeRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);
  const controllersRef = useRef(new Map<string, { conversationId: string; controller: AbortController }>());

  const active = useMemo(() => conversations.find((item) => item.id === activeId) ?? null, [conversations, activeId]);
  const activeJobs = active ? Object.values(jobs).filter(job => job.conversationId === active.id) : [];
  const activeRunning = activeJobs.some(job => job.status === "running");
  const attachment = active ? attachments[active.id] : undefined;
  const question = active ? questions[active.id] ?? "" : "";

  useEffect(() => {
    setPreview(null);
    if (!attachment) return;
    const url = URL.createObjectURL(attachment);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [attachment]);

  useEffect(() => {
    if (!activeRunning) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [activeRunning]);

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

  async function load(preserveNew = false) {
    const query = new URLSearchParams({ bookId });
    if (contentId) query.set("contentId", contentId);
    const response = await fetch(`/api/reader-ai/conversations?${query}`, { cache: "no-store" });
    if (!response.ok) return;
    const result = await response.json() as { ok?: boolean; conversations?: Conversation[] };
    if (result.ok) setConversations((current) => {
      const remote = result.conversations ?? [];
      return preserveNew ? [...remote, ...current.filter((item) => !remote.some(({ id }) => id === item.id))] : remote;
    });
  }

  useEffect(() => {
    if (!open) {
      setActiveId(null);
      return;
    }
    void load(true).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bookId, contentId]);

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
    for (const { controller } of controllersRef.current.values()) controller.abort();
  }, []);

  async function copyMessage(message: Message) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessage(message.id);
    } catch {
      showToast("Не удалось скопировать сообщение.");
    }
  }

  function showToast(text: string) {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, text }].slice(-4));
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 8000);
  }

  async function createConversation(scope: ReaderAiScope, pageNumber?: number, activate = true): Promise<Conversation | undefined> {
    const response = await fetch("/api/reader-ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, contentId, scope, page: scope === "page" ? pageNumber ?? page : undefined })
    });
    const result = await response.json();
    if (!response.ok || !result.ok || !result.conversation) return;
    setConversations((current) => [result.conversation, ...current]);
    if (activate) setActiveId(result.conversation.id);
    return result.conversation;
  }

  useEffect(() => {
    if (!open || !selectionAttachment) return;
    let cancelled = false;
    const { page: source, file } = selectionAttachment;
    const existing = active?.scope === "page" && active.page === source
      ? active : conversations.find((item) => item.scope === "page" && item.page === source);
    void (async () => {
      try {
        const conversation = existing ?? await createConversation("page", source, false);
        if (cancelled) return;
        if (!conversation) throw new Error("Не удалось открыть разговор для выбранной страницы.");
        setAttachments((current) => ({ ...current, [conversation.id]: file }));
        setActiveId(conversation.id);
        setError("");
        requestAnimationFrame(() => composerRef.current?.focus());
      } catch (cause) {
        if (!cancelled) showToast(cause instanceof Error ? cause.message : "Не удалось прикрепить изображение.");
      } finally {
        if (!cancelled) onSelectionHandled?.();
      }
    })();
    return () => { cancelled = true; };
    // A new selection is the only trigger; conversation creation updates the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectionAttachment]);

  async function removeConversation(id: string) {
    for (const job of Object.values(jobs)) {
      if (job.conversationId === id && job.status === "running") await stopJob(job.jobId);
    }
    const response = await fetch(`/api/reader-ai/conversations?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) return;
    setConversations((current) => current.filter((item) => item.id !== id));
    setAttachments((current) => { const next = { ...current }; delete next[id]; return next; });
    setQuestions((current) => { const next = { ...current }; delete next[id]; return next; });
    setJobs((current) => Object.fromEntries(Object.entries(current).filter(([, job]) => job.conversationId !== id)));
    if (activeId === id) setActiveId(null);
  }

  function pasteImage(event: ClipboardEvent) {
    if (!active) return;
    const image = Array.from(event.clipboardData.files).find((file) => file.type.startsWith("image/"))
      ?? Array.from(event.clipboardData.items ?? []).find((item) => item.kind === "file" && item.type.startsWith("image/"))?.getAsFile();
    if (!image) return;
    event.preventDefault();
    const id = active.id;
    void prepareReaderImage(image, "clipboard-image").then((file) => {
      setAttachments((current) => ({ ...current, [id]: file }));
      setError("");
    }).catch(() => setError("Не удалось подготовить изображение из буфера обмена."));
  }

  async function stopJob(jobId: string) {
    const job = jobs[jobId];
    if (!job || job.status !== "running") return;
    controllersRef.current.get(jobId)?.controller.abort(new Error("Cancelled"));
    controllersRef.current.delete(jobId);
    void cancelQueuedReaderJob(jobId).then(notifyReaderUsage).catch(() => undefined);
    void fetch("/api/reader-ai/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.jobId })
    }).catch(() => undefined);
    setJobs((current) => { const next = { ...current }; delete next[jobId]; return next; });
  }

  async function run(action: ReaderAiAction) {
    if (!active) return;
    setError("");
    const conversation = active;
    const userContent = action === "ask"
      ? question.trim()
      : action === "summary"
        ? "Кратко перескажи этот материал."
        : action === "explain"
          ? "Объясни этот материал простыми словами."
          : "Составь вопросы для самопроверки.";
    if (action === "ask" && !userContent) return;
    const prompt = action === "ask" ? userContent.replace(IMAGE_COMMAND, " ").trim() : userContent;
    const output = prompt !== userContent && action === "ask" ? "image" : "text";
    if (!prompt) { setError("Добавьте описание после #create_immage."); return; }
    const sourcePage = conversation.scope === "page" ? conversation.page : null;
    const image = output === "text" && action === "ask" ? attachment : undefined;

    const jobId = crypto.randomUUID();
    const controller = new AbortController();
    controllersRef.current.set(jobId, { conversationId: conversation.id, controller });
    const startedAt = Date.now();
    setNow(startedAt);
    setJobs((current) => ({ ...current, [jobId]: { jobId, conversationId: conversation.id, status: "running", startedAt, stage: image || output === "image" ? "submitted" : "preparing" } }));
    const optimisticId = `local-${jobId}`;
    if (output === "text") {
      setConversations((current) => current.map((item) => item.id === conversation.id ? {
        ...item,
        messages: [...item.messages, { id: optimisticId, role: "user", content: userContent, image, createdAt: new Date().toISOString() }]
      } : item));
    }
    if (image) setAttachments((current) => current[conversation.id] === image ? { ...current, [conversation.id]: undefined } : current);
    if (action === "ask") setQuestions((current) => ({ ...current, [conversation.id]: "" }));

    try {
      const text = image || output === "image" ? "" : (await getText(conversation.scope, conversation.page ?? undefined)).trim();
      controller.signal.throwIfAborted();
      if (!image && output === "text" && !text) throw new Error("В PDF не удалось получить текст.");
      const requestPayload = JSON.stringify({
        action, output, scope: conversation.scope, title, text, bookId, contentId, jobId,
        page: sourcePage ?? undefined,
        question: action === "ask" ? prompt : undefined,
        conversationId: conversation.id
      });
      const form = image ? new FormData() : null;
      if (form && image) {
        form.set("image", image);
        form.set("payload", requestPayload);
      }
      const setStage = (stage: JobState["stage"]) => {
        setJobs(current => current[jobId]?.stage !== stage && current[jobId]?.status === "running"
          ? { ...current, [jobId]: { ...current[jobId], stage } } : current);
      };
      setStage("submitted");
      const response = await fetch("/api/reader-ai", {
        method: "POST",
        headers: form ? undefined : { "Content-Type": "application/json" },
        body: form ?? requestPayload
      });
      const payload = await response.json().catch(() => ({})) as { answer?: string; image?: string; error?: string; jobId?: string };
      if (controller.signal.reason instanceof Error && controller.signal.reason.message === "Cancelled" && response.status === 202 && payload.jobId) {
        void cancelQueuedReaderJob(payload.jobId).then(notifyReaderUsage).catch(() => undefined);
      }
      controller.signal.throwIfAborted();
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      if (output === "image") {
        if (!payload.image) throw new Error("OpenAI не вернул изображение.");
        setIllustration({ conversationId: conversation.id, src: `data:image/jpeg;base64,${payload.image}` });
      } else {
        let answer = payload.answer;
        if (response.status === 202 && payload.jobId) {
          setStage("queued");
          notifyReaderUsage();
          answer = await waitForReaderJob(payload.jobId, controller.signal, status => {
            setStage(status === "queued" ? "queued" : "processing");
          });
        }
        if (!answer) throw new Error("AI Reader не вернул ответ.");
        const createdAt = new Date().toISOString();
        setConversations((current) => current.map((item) => item.id === conversation.id ? {
          ...item, updatedAt: createdAt, messages: item.messages.flatMap(message => message.id === optimisticId
            ? [message, { id: `answer-${jobId}`, role: "assistant", content: answer, createdAt }] : [message])
        } : item));
      }
      setJobs((current) => current[jobId]?.jobId === jobId ? { ...current, [jobId]: { jobId, conversationId: conversation.id, status: "done", startedAt, finishedAt: Date.now() } } : current);
      showToast(`${conversation.scope === "document" ? "PDF" : `Страница ${conversation.page}`}: AI Reader завершил ответ.`);
    } catch (cause) {
      if (image) setAttachments((current) => current[conversation.id] ? current : { ...current, [conversation.id]: image });
      if (controller.signal.aborted || (cause instanceof Error && cause.message === "Cancelled")) {
        setConversations((current) => current.map((item) => item.id === conversation.id
          ? { ...item, messages: item.messages.filter((message) => message.id !== optimisticId) }
          : item));
        setJobs((current) => { if (current[jobId]?.jobId !== jobId) return current; const next = { ...current }; delete next[jobId]; return next; });
      } else {
        setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, messages: item.messages.filter((message) => message.id !== optimisticId) } : item));
        if (action === "ask") setQuestions((current) => current[conversation.id] ? current : { ...current, [conversation.id]: userContent });
        setJobs((current) => ({ ...current, [jobId]: { jobId, conversationId: conversation.id, status: "error", startedAt, finishedAt: Date.now() } }));
        setError(cause instanceof Error ? cause.message : "Не удалось получить ответ AI Reader.");
      }
    } finally {
      controllersRef.current.delete(jobId);
      notifyReaderUsage();
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

  function resizeComposer(height: number) {
    const chat = composerRef.current?.closest<HTMLElement>(".reader-ai-chat");
    if (!chat) return;
    const maxHeight = Math.max(42, Math.min(420, chat.clientHeight * 0.5));
    setComposerHeight(Math.round(Math.min(maxHeight, Math.max(42, height))));
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
    const relatedJobs = Object.values(jobs).filter(job => job.conversationId === conversationId);
    const state = relatedJobs.find(job => job.status === "running") ?? relatedJobs.at(-1);
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
          <div className="reader-ai-chat" onPaste={pasteImage}>
            <header className="reader-ai-chat-header">
              <div><p className="reader-ai-chat-kicker">AI Reader</p><strong>{active.scope === "document" ? "PDF" : `Страница ${active.page}`}</strong></div>
              <div className="reader-ai-chat-actions">
                <button type="button" onClick={() => void createConversation(active.scope, active.page ?? undefined)} title="Новый разговор"><Plus size={16} /></button>
                <button type="button" onClick={() => void removeConversation(active.id)} title="Удалить"><Trash2 size={16} /></button>
                <button type="button" onClick={() => setActiveId(null)} title="Закрыть разговор"><X size={17} /></button>
              </div>
            </header>
            <div className="reader-ai-chat-messages">
              {active.messages.length ? active.messages.map((message) => (
                <div key={message.id} className={`reader-ai-msg-row is-${message.role}`} tabIndex={0} onMouseLeave={() => setCopiedMessage((id) => id === message.id ? undefined : id)}>
                  <div className={`reader-ai-message is-${message.role}`}>
                    {message.image ? <SentImage file={message.image} /> : null}
                    {message.role === "assistant" ? <ReaderAnswer content={message.content} /> : message.content}
                  </div>
                  <div className="reader-ai-msg-tools">
                    <time dateTime={message.createdAt}>{timeLabel(message.createdAt)}</time>
                    <button type="button" onClick={() => void copyMessage(message)} aria-label={copiedMessage === message.id ? "Скопировано" : "Скопировать сообщение"} title="Скопировать">
                      {copiedMessage === message.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )) : <p className="reader-rail-empty">Начните разговор с AI Reader.</p>}
              {illustration?.conversationId === active.id ? (
                <figure className="reader-ai-message is-assistant">
                  <Image src={illustration.src} alt={`Иллюстрация к странице ${active.page}`} width={1024} height={1024} unoptimized className="h-auto max-w-full rounded-lg" />
                  <a href={illustration.src} download={`page-${active.page}-illustration.jpg`} className="underline">Скачать иллюстрацию</a>
                </figure>
              ) : null}
              {activeJobs.map(activeJob => <div key={activeJob.jobId} className="reader-ai-message is-assistant is-loading">
                {activeJob.status === "running" ? <LoaderCircle size={15} className="reader-ai-spin" /> : activeJob.status === "done" ? <Check size={15} /> : null}
                {activeJob.status === "running" ? (activeJob.stage === "preparing" ? "Preparing PDF text" : activeJob.stage === "queued" ? "Queued" : activeJob.stage === "processing" ? "Agent Studio working" : "Waiting for response") : activeJob.status === "done" ? "Worked" : "Failed after"} · {elapsedLabel((activeJob.finishedAt ?? now) - activeJob.startedAt)}
                {activeJob.status === "running" && <button type="button" onClick={() => void stopJob(activeJob.jobId)} aria-label="Остановить запрос" title="Остановить запрос"><Square size={13} /></button>}
              </div>)}
            </div>
            <div className="reader-ai-quick-actions">
              <button type="button" onClick={() => void run("summary")}>Кратко</button>
              <button type="button" onClick={() => void run("explain")}>Объяснить</button>
              <button type="button" onClick={() => void run("questions")}>Вопросы</button>
            </div>
            {error ? <p className="reader-ai-error">{error}</p> : null}
            {attachment && preview ? (
              <div className="reader-ai-attachment">
                <Image src={preview} alt="Вложение к сообщению" width={112} height={72} unoptimized />
                <button type="button" aria-label="Убрать вложение" onClick={() => setAttachments((current) => ({ ...current, [active.id]: undefined }))}><X size={15} /></button>
              </div>
            ) : null}
            <button
              type="button"
              className="reader-ai-composer-grip"
              aria-label="Изменить высоту поля ввода (стрелки вверх и вниз)"
              title="Потяните, чтобы изменить высоту поля ввода"
              onPointerDown={(event) => {
                if (event.button !== 0 || !composerRef.current) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                composerDrag.current = { pointerId: event.pointerId, startY: event.clientY, height: composerRef.current.offsetHeight };
              }}
              onPointerMove={(event) => {
                const drag = composerDrag.current;
                if (drag?.pointerId === event.pointerId) resizeComposer(drag.height + drag.startY - event.clientY);
              }}
              onLostPointerCapture={() => { composerDrag.current = null; }}
              onKeyDown={(event) => {
                if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                event.preventDefault();
                resizeComposer((composerRef.current?.offsetHeight ?? composerHeight) + (event.key === "ArrowUp" ? 20 : -20));
              }}
            />
            <div className="reader-ai-composer">
              <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                const id = active.id;
                void prepareReaderImage(file, "reader-attachment").then((image) => {
                  setAttachments((current) => ({ ...current, [id]: image }));
                }).catch(() => showToast("Не удалось прикрепить изображение."));
              }} />
              <button type="button" title="Прикрепить изображение" aria-label="Прикрепить изображение" onClick={() => imageInputRef.current?.click()}><Paperclip size={16} /></button>
              <textarea ref={composerRef} style={{ height: composerHeight }} aria-label="Сообщение AI Reader" value={question} onChange={(event) => {
                const value = event.target.value;
                setQuestions((current) => ({ ...current, [active.id]: value }));
              }} rows={2} maxLength={2000} placeholder="Вопрос или #create_immage…" onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing && !event.shiftKey && question.trim()) { event.preventDefault(); void run("ask"); }
              }} />
              <button type="button" disabled={!question.trim()} onClick={() => void run("ask")} title="Отправить"><Send size={16} /></button>
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
