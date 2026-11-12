"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { PageFlip, type SizeType } from "page-flip";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

import { ReaderAiPanel, type ReaderAiAttachment } from "@/components/reader/reader-ai-panel";
import { ReaderSelectionSearch } from "@/components/reader/reader-selection-search";
import { ReaderFloatingToolbar } from "@/components/reader/reader-floating-toolbar";
import { ReaderAnnotationsPanel } from "@/components/reader/reader-annotations-panel";
import { ReaderNotesRail } from "@/components/reader/reader-notes-rail";
import { ReaderSearchPanel, type ReaderSearchHit } from "@/components/reader/reader-search-panel";
import {
  APP_SETTINGS_EVENT,
  APP_SETTINGS_STORAGE_KEY,
  readAppSettingsFromBrowser
} from "@/lib/preferences/settings";
import { openReaderPageCache, type ReaderDocumentInfo } from "@/lib/reading/reader-page-cache";
import { cropReaderPage, readerImageBounds, readerPageFile } from "@/lib/reading/page-image";
import { customHighlightColor } from "@/lib/reading/highlight-color";

type PdfFlipReaderProps = {
  title: string;
  slug: string;
  language: string;
  fileUrl: string;
  bookId: string;
  contentId: string | null;
  cacheScope?: string;
  initialPage?: number;
  isAuthenticated: boolean;
};

type ReadingPosition = { page: number; landscape: boolean };
type HighlightRect = { x: number; y: number; width: number; height: number };
type AnnotationRecord = {
  id: string;
  page: number;
  quote: string | null;
  note: string | null;
  rects: unknown;
  color: string;
  createdAt?: string;
};

type HighlightContextMenu = { id: string; x: number; y: number } | null;

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const OCR_IMAGE_WIDTH = 1400;
const READER_BUILD = "reader-v14";

function fitPage(stage: HTMLElement, aspect: number, totalPages: number) {
  const columns = totalPages > 1 && window.innerWidth > 760 && stage.offsetWidth >= 560 ? 2 : 1;
  const widthBudget = (stage.offsetWidth - 28) / columns;
  const heightBudget = stage.offsetHeight - 28;
  const width = Math.max(1, Math.floor(Math.min(widthBudget, heightBudget / aspect)));
  return { width, height: Math.round(width * aspect), columns };
}

function rasterWidth(pageWidth: number, zoom: number) {
  return Math.min(4096, Math.max(1024, Math.ceil(pageWidth * zoom * window.devicePixelRatio / 256) * 256));
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Не удалось создать изображение страницы."));
    }, "image/png");
  });
}

function normalizePage(value: number, total: number) {
  const page = Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.min(total, Math.max(1, page));
}

function clampZoom(value: number) {
  return Math.min(1.8, Math.max(0.65, Math.round(value * 20) / 20));
}

function splitSpeechText(text: string, maxLength = 260) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [] as string[];
  const sentences = normalized.match(/[^.!?…]+[.!?…]?/g) ?? [normalized];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const clean = sentence.trim();
    const next = current ? `${current} ${clean}` : clean;
    if (next.length > maxLength && current) {
      chunks.push(current);
      current = clean;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks.flatMap((chunk) =>
    chunk.length <= maxLength
      ? [chunk]
      : Array.from({ length: Math.ceil(chunk.length / maxLength) }, (_, index) =>
          chunk.slice(index * maxLength, (index + 1) * maxLength)
        )
  );
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

type PdfTextLike = {
  str: string;
  transform?: number[];
  width?: number;
  height?: number;
  hasEOL?: boolean;
};

const MATH_GLYPH_RE = /[∑∏∫∮√∞≈≠≤≥±×÷∂∇∈∉⊂⊃⊆⊇∪∩∧∨¬→←↔⇒⇔α-ωΑ-Ω]/u;

function pdfTextItem(value: unknown): PdfTextLike | null {
  if (!value || typeof value !== "object" || !("str" in value)) return null;
  const item = value as Partial<PdfTextLike>;
  return typeof item.str === "string" && item.str ? item as PdfTextLike : null;
}

function extractNativePdfText(items: unknown[]): { text: string; hasMath: boolean } {
  const parts: string[] = [];
  let hasMath = false;
  let previous: { xEnd: number; y: number; height: number; text: string; hasEOL: boolean } | null = null;
  let lineBaseline = 0;
  let lineHeight = 0;

  for (const raw of items) {
    const item = pdfTextItem(raw);
    if (!item) continue;
    const transform = Array.isArray(item.transform) ? item.transform : [];
    const x = Number(transform[4] ?? 0);
    const y = Number(transform[5] ?? 0);
    const transformHeight = Math.hypot(Number(transform[2] ?? 0), Number(transform[3] ?? 0));
    const transformWidth = Math.hypot(Number(transform[0] ?? 0), Number(transform[1] ?? 0));
    const height = Math.max(1, Math.abs(Number(item.height ?? 0)) || transformHeight || transformWidth || 10);
    const width = Math.max(0, Math.abs(Number(item.width ?? 0)));
    const clean = item.str.replace(/\s+/g, " ").trim();
    if (!clean) continue;

    if (MATH_GLYPH_RE.test(clean)) hasMath = true;

    const startsNewLine = previous
      ? previous.hasEOL || Math.abs(y - lineBaseline) > Math.max(4, lineHeight * 0.9, height * 0.9)
      : false;

    if (!previous || startsNewLine) {
      if (previous && parts.length && parts[parts.length - 1] !== "\n") parts.push("\n");
      parts.push(clean);
      lineBaseline = y;
      lineHeight = height;
    } else {
      const baselineDelta = y - lineBaseline;
      const isSmaller = height < lineHeight * 0.9;
      const isSuperscript = isSmaller && baselineDelta > Math.max(1.2, lineHeight * 0.12);
      const isSubscript = isSmaller && baselineDelta < -Math.max(1.2, lineHeight * 0.12);
      const gap = x - previous.xEnd;
      const punctuation = /^[,.;:!?%)\]}]/.test(clean);
      const opening = /[(\[{]$/.test(previous.text);
      const needsSpace = !isSuperscript && !isSubscript && !punctuation && !opening && gap > Math.max(0.7, lineHeight * 0.12);

      if (needsSpace && parts[parts.length - 1] !== "\n") parts.push(" ");
      if (isSuperscript) {
        parts.push(`^{${clean}}`);
        hasMath = true;
      } else if (isSubscript) {
        parts.push(`_{${clean}}`);
        hasMath = true;
      } else {
        parts.push(clean);
        if (height >= lineHeight * 0.9) {
          lineBaseline = (lineBaseline + y) / 2;
          lineHeight = Math.max(lineHeight, height);
        }
      }
    }

    previous = {
      xEnd: x + width,
      y,
      height,
      text: clean,
      hasEOL: Boolean(item.hasEOL)
    };
  }

  const text = parts
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, hasMath };
}

async function waitForVoices(synth: SpeechSynthesis) {
  const immediate = synth.getVoices();
  if (immediate.length) return immediate;
  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener("voiceschanged", finish);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", finish, { once: true });
    window.setTimeout(finish, 1200);
  });
}

function parsedRects(value: unknown): HighlightRect[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is HighlightRect => {
    if (!item || typeof item !== "object") return false;
    const rect = item as Partial<HighlightRect>;
    return [rect.x, rect.y, rect.width, rect.height].every((entry) => typeof entry === "number" && Number.isFinite(entry));
  });
}

export default function PdfFlipReader({
  title,
  slug,
  language,
  fileUrl,
  bookId,
  contentId,
  cacheScope,
  initialPage = 1,
  isAuthenticated
}: PdfFlipReaderProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const flipRef = useRef<PageFlip | null>(null);
  const initialPageRef = useRef(initialPage);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const pageTextsRef = useRef<Record<number, string>>({});
  const pageMathHintsRef = useRef<Record<number, boolean>>({});
  const mathOcrAttemptedRef = useRef<Set<number>>(new Set());
  const pageLoaderRef = useRef<{
    show: (page: number, width: number, prefetch?: boolean) => Promise<void>;
    raster: (page: number, width: number) => Promise<Blob>;
    readText: (page: number) => Promise<void>;
    selectionText: (page: number, rect: HighlightRect, aspect: number) => Promise<string>;
    retain: (first: number, last: number) => void;
  } | null>(null);
  const ocrJobsRef = useRef<Map<number, Promise<string>>>(new Map());
  const speechRunIdRef = useRef(0);
  const annotationModeRef = useRef(false);
  const annotationsRef = useRef<AnnotationRecord[]>([]);
  const documentInfoRef = useRef<ReaderDocumentInfo | null>(null);
  const currentPageRef = useRef(initialPage);

  const [totalPages, setTotalPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toolMessage, setToolMessage] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [position, setPosition] = useState<ReadingPosition>({ page: 1, landscape: false });
  const [zoom, setZoom] = useState(1);
  const [speechRate, setSpeechRate] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiOpeningSpread, setAiOpeningSpread] = useState<{ first: number; last: number } | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [annotationsOpen, setAnnotationsOpen] = useState(false);
  const [notesListOpen, setNotesListOpen] = useState(false);
  const [aiRailWidth, setAiRailWidth] = useState(340);
  const [pendingHighlight, setPendingHighlight] = useState<{
    page: number; rect: HighlightRect; aspect: number; anchor: { x: number; y: number };
  } | null>(null);
  const [editingHighlight, setEditingHighlight] = useState(false);
  const [selectionAttachment, setSelectionAttachment] = useState<ReaderAiAttachment | null>(null);
  const [attachingSelection, setAttachingSelection] = useState(false);
  const [selectionSearch, setSelectionSearch] = useState<{ anchor: { x: number; y: number }; getImage: () => Promise<File>; getText: () => Promise<string> } | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationRecord | null>(null);
  const [highlightContextMenu, setHighlightContextMenu] = useState<HighlightContextMenu>(null);
  const [annotations, setAnnotations] = useState<AnnotationRecord[]>([]);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchHits, setSearchHits] = useState<ReaderSearchHit[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);

  useEffect(() => {
    console.info(`[reader] build=${READER_BUILD}`);
    const desktop = window.matchMedia("(min-width: 1024px)");
    const syncNotes = () => setNotesListOpen(desktop.matches);
    syncNotes();
    desktop.addEventListener("change", syncNotes);
    return () => desktop.removeEventListener("change", syncNotes);
  }, []);

  useEffect(() => {
    currentPageRef.current = position.page;
  }, [position.page]);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const stopSavedHighlight = (event: Event) => {
      const element = event.target instanceof Element ? event.target.closest<HTMLElement>(".reader-saved-highlight") : null;
      if (!element) return;
      const id = element.dataset.annotationId;
      if (!id) return;
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!(event instanceof MouseEvent) || event.button === 0) event.preventDefault();
      if (event.type === "pointerdown" && event instanceof PointerEvent && event.button === 0) {
        const annotation = annotationsRef.current.find((item) => item.id === id);
        if (annotation) {
          setPendingHighlight(null);
          setSelectedAnnotation(annotation);
        }
      }
    };
    const openSavedHighlightMenu = (event: Event) => {
      const element = event.target instanceof Element ? event.target.closest<HTMLElement>(".reader-saved-highlight") : null;
      if (!element) return;
      const id = element.dataset.annotationId;
      if (!id) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const mouse = event as MouseEvent;
      setHighlightContextMenu({ id, x: mouse.clientX, y: mouse.clientY });
    };

    mount.addEventListener("pointerdown", stopSavedHighlight, true);
    mount.addEventListener("mousedown", stopSavedHighlight, true);
    mount.addEventListener("touchstart", stopSavedHighlight, { capture: true, passive: false });
    mount.addEventListener("click", stopSavedHighlight, true);
    mount.addEventListener("contextmenu", openSavedHighlightMenu, true);
    return () => {
      mount.removeEventListener("pointerdown", stopSavedHighlight, true);
      mount.removeEventListener("mousedown", stopSavedHighlight, true);
      mount.removeEventListener("touchstart", stopSavedHighlight, true);
      mount.removeEventListener("click", stopSavedHighlight, true);
      mount.removeEventListener("contextmenu", openSavedHighlightMenu, true);
    };
  }, [ready]);

  const fitBookToStage = useCallback(() => {
    const mount = mountRef.current;
    const stage = mount?.closest<HTMLElement>(".pdf3d-stage");
    const host = mount?.querySelector<HTMLElement>(".pdf3d-book");
    const clip = mount?.querySelector<HTMLElement>(".pdf3d-book-clip");
    const info = documentInfoRef.current;
    if (!stage || !host || !clip || !info) return null;

    stage.style.setProperty("--page-aspect", String(info.aspect));
    const { width, height, columns } = fitPage(stage, info.aspect, info.pages);
    const bookWidth = width * columns;
    clip.style.setProperty("--book-width", bookWidth + "px");
    clip.style.setProperty("--book-height", height + "px");
    Object.assign(host.style, {
      width: bookWidth + "px", height: height + "px",
      minWidth: bookWidth + "px", minHeight: height + "px", maxWidth: bookWidth + "px"
    });

    const engine = flipRef.current;
    if (engine) {
      Object.assign(engine.getSettings(), { width, height, usePortrait: true });
      engine.update();
    }
    setPageWidth(width);
    return { width, height, columns };
  }, []);

  useEffect(() => {
    let frame = 0;
    const stage = mountRef.current?.closest(".pdf3d-stage");
    const scheduleFit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { fitBookToStage(); });
    };
    const syncFullscreen = () => {
      const engine = flipRef.current;
      initialPageRef.current = engine ? engine.getCurrentPageIndex() + 1 : currentPageRef.current;
      setFullscreenActive(document.fullscreenElement === sectionRef.current);
      scheduleFit();
    };

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleFit);
    if (stage) observer?.observe(stage, { box: "border-box" });
    document.addEventListener("fullscreenchange", syncFullscreen);
    window.addEventListener("resize", scheduleFit, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener("fullscreenchange", syncFullscreen);
      window.removeEventListener("resize", scheduleFit);
    };
  }, [fitBookToStage]);

  useEffect(() => {
    let previousDefaultZoom: number | undefined;
    function syncSettings() {
      const settings = readAppSettingsFromBrowser();
      const defaultZoom = clampZoom(settings.readerZoom);
      // Toolbar preferences share the settings event with the default zoom.
      if (defaultZoom !== previousDefaultZoom) {
        previousDefaultZoom = defaultZoom;
        setZoom(defaultZoom);
      }
      setSpeechRate(settings.speechRate);
      setAiEnabled(settings.readerAiEnabled);
      if (!settings.readerAiEnabled) setAiOpen(false);
    }
    function onStorage(event: StorageEvent) {
      if (event.key === APP_SETTINGS_STORAGE_KEY) syncSettings();
    }
    syncSettings();
    window.addEventListener(APP_SETTINGS_EVENT, syncSettings);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(APP_SETTINGS_EVENT, syncSettings);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    stopSpeech();
  }, [position.page]);

  useEffect(() => {
    initialPageRef.current = initialPage;
  }, [initialPage]);

  const loadAnnotations = useCallback(async () => {
    if (!isAuthenticated) return;
    const response = await fetch(`/api/reader-annotations?bookId=${encodeURIComponent(bookId)}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { ok?: boolean; annotations?: AnnotationRecord[] };
    if (payload.ok) setAnnotations(payload.annotations ?? []);
  }, [bookId, isAuthenticated]);

  useEffect(() => {
    void loadAnnotations();
  }, [loadAnnotations]);

  useEffect(() => {
    if (!highlightContextMenu) return;
    const close = () => setHighlightContextMenu(null);
    window.addEventListener("pointerdown", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("blur", close);
    };
  }, [highlightContextMenu]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    let engine: PageFlip | null = null;
    let engineLoaded = false;
    let loadingTask: ReturnType<typeof pdfjs.getDocument> | null = null;
    const renderTasks = new Set<{ cancel: () => void }>();
    const images = new Map<number, { element: HTMLImageElement; url?: string; width?: number; request?: number }>();
    const rasterJobs = new Map<string, Promise<Blob>>();
    const cachePromise = openReaderPageCache(cacheScope);
    let documentInfo: ReaderDocumentInfo | undefined;

    function getDocument() {
      if (cancelled) throw new Error("Чтение отменено.");
      loadingTask ??= pdfjs.getDocument({
        url: fileUrl.trim(),
        disableAutoFetch: true,
        disableStream: true,
        rangeChunkSize: 256 * 1024
      });
      return loadingTask.promise;
    }

    async function readText(number: number) {
      if (number in pageTextsRef.current) return;
      const pdf = await getDocument();
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      if (cancelled) return;
      const extracted = extractNativePdfText(content.items as unknown[]);
      pageTextsRef.current[number] = extracted.text;
      pageMathHintsRef.current[number] = extracted.hasMath;
    }

    async function selectionText(number: number, rect: HighlightRect, aspect: number) {
      const pdf = await getDocument();
      const page = await pdf.getPage(number);
      const viewport = page.getViewport({ scale: 1 });
      const area = readerImageBounds(rect, aspect, viewport.width, viewport.height);
      const content = await page.getTextContent();
      const selected: string[] = [];
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const [a, b, , , x, y] = pdfjs.Util.transform(viewport.transform, item.transform);
        const left = x;
        const right = x + item.width;
        const top = y - item.height;
        if (Math.min(right, area.right) - Math.max(left, area.left) <= 0 ||
            Math.min(y, area.bottom) - Math.max(top, area.top) <= item.height / 2) continue;
        // A PDF text item may be an entire line. OCR handles partial items
        // and rotated/vertical text instead of returning extra words.
        if (left < area.left - 1 || right > area.right + 1 || a <= 0 || Math.abs(b) > .01 || item.dir === "ttb") return "";
        selected.push(item.str);
      }
      return selected.join(" ").trim();
    }

    function raster(number: number, width: number) {
      const key = number + ":" + width;
      const existing = rasterJobs.get(key);
      if (existing) return existing;

      const job = (async () => {
        const cache = await cachePromise;
        const cached = await cache?.readPage(number, width).catch(() => undefined);
        if (cached?.size) return cached;
        const pdf = await getDocument();
        const page = await pdf.getPage(number);
        if (cancelled) throw new Error("Чтение отменено.");
        const original = page.getViewport({ scale: 1 });
        const scale = Math.min(width / original.width, Math.sqrt(12_000_000 / (original.width * original.height)));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Браузер не поддерживает Canvas.");

        const task = page.render({ canvas, canvasContext: context, viewport, background: "#ffffff" });
        renderTasks.add(task);
        try {
          await task.promise;
          const image = await canvasToBlob(canvas);
          if (!cancelled) void cache?.savePage(number, width, image);
          return image;
        } finally {
          renderTasks.delete(task);
          canvas.width = 0;
          canvas.height = 0;
          page.cleanup();
        }
      })().finally(() => rasterJobs.delete(key));
      rasterJobs.set(key, job);
      return job;
    }

    async function show(number: number, width: number, prefetch = false) {
      const image = images.get(number);
      if (!image) return;
      image.request = width;
      if ((image.width ?? 0) >= width) return;
      const blob = prefetch && !loadingTask
        ? await (await cachePromise)?.readPage(number, width).catch(() => undefined)
        : await raster(number, width);
      if (!blob || cancelled || image.request !== width || (image.width ?? 0) >= width) return;
      const url = URL.createObjectURL(blob);
      const preview = new Image();
      preview.src = url;
      try {
        await preview.decode();
        if (cancelled || image.request !== width || (image.width ?? 0) >= width) return;
        if (image.url) URL.revokeObjectURL(image.url);
        image.element.src = url;
        image.element.hidden = false;
        image.url = url;
        image.width = width;
      } finally {
        if (image.url !== url) URL.revokeObjectURL(url);
      }
    }

    function retain(first: number, last: number) {
      for (const [number, image] of images) {
        if (number >= first && number <= last) continue;
        image.request = undefined;
        if (!image.url) continue;
        URL.revokeObjectURL(image.url);
        image.element.removeAttribute("src");
        image.element.hidden = true;
        image.url = undefined;
        image.width = undefined;
      }
    }
    const loader = { show, raster, readText, retain, selectionText };
    pageLoaderRef.current = loader;

    const clip = document.createElement("div");
    clip.className = "pdf3d-book-clip";
    const host = document.createElement("div");
    host.className = "pdf3d-book";
    clip.appendChild(host);
    mount.appendChild(clip);

    pageTextsRef.current = {};
    ocrJobsRef.current.clear();
    mathOcrAttemptedRef.current.clear();
    pageMathHintsRef.current = {};
    setReady(false);
    setBusy(false);
    setError("");
    setToolMessage("");
    setSaveError(false);
    setTotalPages(0);
    setPageWidth(0);
    documentInfoRef.current = null;
    setPosition({ page: 1, landscape: false });

    function installAnnotationLayer(sheet: HTMLDivElement, pageNumber: number) {
      const layer = document.createElement("div");
      layer.className = "reader-page-annotation-layer";
      layer.dataset.page = String(pageNumber);
      let pointerId: number | null = null;
      let startX = 0;
      let startY = 0;
      let draft: HTMLDivElement | null = null;

      const stopIfActive = (event: Event) => {
        if (!annotationModeRef.current) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest(".reader-saved-highlight")) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      };

      layer.addEventListener("click", stopIfActive, true);
      layer.addEventListener("mousedown", stopIfActive, true);
      layer.addEventListener("touchstart", stopIfActive, { capture: true, passive: false });

      layer.addEventListener("pointerdown", (event) => {
        if (!annotationModeRef.current || event.button !== 0) return;
        if ((event.target as HTMLElement | null)?.closest(".reader-saved-highlight")) return;
        event.preventDefault();
        event.stopPropagation();
        pointerId = event.pointerId;
        layer.setPointerCapture(event.pointerId);
        const rect = layer.getBoundingClientRect();
        startX = clamp01((event.clientX - rect.left) / rect.width);
        startY = clamp01((event.clientY - rect.top) / rect.height);
        draft = document.createElement("div");
        draft.className = "reader-direct-highlight reader-direct-highlight--draft";
        layer.appendChild(draft);
      });

      layer.addEventListener("pointermove", (event) => {
        if (pointerId !== event.pointerId || !draft) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = layer.getBoundingClientRect();
        const x2 = clamp01((event.clientX - rect.left) / rect.width);
        const y2 = clamp01((event.clientY - rect.top) / rect.height);
        const x = Math.min(startX, x2);
        const y = Math.min(startY, y2);
        const width = Math.abs(x2 - startX);
        const height = Math.abs(y2 - startY);
        Object.assign(draft.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${width * 100}%`, height: `${height * 100}%` });
      });

      const finish = (event: PointerEvent) => {
        if (pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = layer.getBoundingClientRect();
        const x2 = clamp01((event.clientX - rect.left) / rect.width);
        const y2 = clamp01((event.clientY - rect.top) / rect.height);
        const highlight = {
          x: Math.min(startX, x2),
          y: Math.min(startY, y2),
          width: Math.abs(x2 - startX),
          height: Math.abs(y2 - startY)
        };
        draft?.remove();
        draft = null;
        try {
          if (layer.hasPointerCapture(event.pointerId)) layer.releasePointerCapture(event.pointerId);
        } catch {
          // Browser may release automatically.
        }
        pointerId = null;
        if (event.type === "pointerup" && highlight.width > 0.008 && highlight.height > 0.006) {
          setSelectedAnnotation(null);
          setEditingHighlight(false);
          setSelectionSearch(null);
          setPendingHighlight({
            page: pageNumber, rect: highlight, aspect: layer.clientWidth / layer.clientHeight,
            anchor: { x: Math.min(rect.left + (highlight.x + highlight.width) * rect.width + 8, document.documentElement.clientWidth - 126),
              y: Math.min(event.clientY, document.documentElement.clientHeight - 174) }
          });
          setAnnotationsOpen(true);
          annotationModeRef.current = true;
        }
      };
      layer.addEventListener("pointerup", finish);
      layer.addEventListener("pointercancel", finish);
      sheet.appendChild(layer);
    }

    async function openBook() {
      try {
        if (!fileUrl.trim()) throw new Error("Не указана ссылка на PDF.");
        const cache = await cachePromise;
        documentInfo = await cache?.readInfo().catch(() => undefined);
        if (!documentInfo) {
          const pdf = await getDocument();
          if (pdf.numPages < 1) throw new Error("PDF не содержит страниц.");
          const first = await pdf.getPage(1);
          const viewport = first.getViewport({ scale: 1 });
          documentInfo = { pages: pdf.numPages, aspect: viewport.height / viewport.width };
          first.cleanup();
          if (!cancelled) void cache?.saveInfo(documentInfo);
        }
        if (cancelled) return;
        documentInfoRef.current = documentInfo;
        const { pages } = documentInfo;
        setTotalPages(pages);

        const sheets = Array.from({ length: pages }, (_, index) => {
          const number = index + 1;
          const image = new Image();
          image.alt = "Страница " + number;
          image.draggable = false;
          image.hidden = true;
          images.set(number, { element: image });

          const sheet = document.createElement("div");
          sheet.className = "pdf3d-sheet";
          sheet.dataset.density = "soft";
          sheet.dataset.pageNumber = String(number);
          sheet.setAttribute("aria-label", image.alt);
          sheet.appendChild(image);
          installAnnotationLayer(sheet, number);
          return sheet;
        });

        const dimensions = fitBookToStage();
        if (!dimensions) return;
        const { width, height, columns } = dimensions;
        const startIndex = normalizePage(initialPageRef.current, pages) - 1;
        // Landscape starts on the even zero-based index of the spread.
        const firstVisible = columns === 2 ? startIndex - (startIndex % 2) + 1 : startIndex + 1;
        const initialWidth = rasterWidth(width, clampZoom(readAppSettingsFromBrowser().readerZoom));
        await Promise.all(Array.from({ length: columns }, (_, i) => firstVisible + i)
          .filter((number) => number <= pages)
          .map((number) => show(number, initialWidth)));
        if (cancelled) return;

        if (pages === 1) {
          host.classList.add("pdf3d-single");
          host.appendChild(sheets[0]);
          host.style.visibility = "visible";
          setPosition({ page: 1, landscape: false });
          setReady(true);
          return;
        }

        const instance = new PageFlip(host, {
          width,
          height,
          size: "fixed" as SizeType,
          startPage: startIndex,
          usePortrait: true,
          autoSize: false,
          showCover: false,
          drawShadow: false,
          maxShadowOpacity: 0,
          flippingTime: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 850,
          useMouseEvents: true,
          showPageCorners: false,
          disableFlipByClick: false,
          mobileScrollSupport: true,
          swipeDistance: 30,
          clickEventForward: false
        });
        engine = instance;
        flipRef.current = instance;

        function syncPosition() {
          if (cancelled) return;
          setPosition({ page: instance.getCurrentPageIndex() + 1, landscape: instance.getOrientation() === "landscape" });
        }
        // Never delete StPageFlip internal `.stf__item` nodes here. They are
        // renderer-managed wrappers around the real PDF sheets, not disposable
        // clones. Removing them after `init`/`read` leaves a perfectly healthy
        // PageFlip instance with an empty viewport (the blank-book bug seen in
        // v12). Ghost pages are contained visually with overflow/contain CSS
        // instead of mutating the library's private DOM.
        instance.on("flip", syncPosition);
        instance.on("changeOrientation", syncPosition);
        instance.on("changeState", (event) => {
          if (cancelled) return;
          const reading = event.data === "read";
          setBusy(!reading);
        });
        instance.on("init", () => { if (!cancelled) { syncPosition(); setReady(true); } });
        instance.loadFromHTML(sheets);
        engineLoaded = true;
        host.style.visibility = "visible";
        syncPosition();
        setReady(true);
        // Initial dimensions are already computed above. Avoid immediately
        // mutating StPageFlip settings during its first paint; that was another
        // source of blank/zero-sized spreads on Chromium. Resize/fullscreen
        // events still call fitBookToStage later.
      } catch (cause) {
        if (cancelled) return;
        console.error("PDF flip reader:", cause);
        host.style.visibility = "hidden";
        setReady(false);
        setBusy(false);
        setError(cause instanceof Error ? cause.message : "Не удалось открыть PDF.");
      }
    }

    void openBook();
    return () => {
      cancelled = true;
      renderTasks.forEach((task) => task.cancel());
      if (pageLoaderRef.current === loader) pageLoaderRef.current = null;
      if (flipRef.current === engine) flipRef.current = null;
      if (engine && engineLoaded) engine.destroy();
      clip.remove();
      images.forEach(({ url }) => { if (url) URL.revokeObjectURL(url); });
      if (loadingTask) void loadingTask.destroy().catch(() => {});
    };
  }, [fileUrl, bookId, contentId, cacheScope, retryCount, fitBookToStage]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    mount.classList.toggle("reader-annotation-mode", annotationsOpen);
    annotationModeRef.current = annotationsOpen;

    // StPageFlip installs its mouse/touch handlers directly on its internal
    // distElement and on window. Stopping events only on the highlight layer is
    // not sufficient because the library can receive the same pointer sequence
    // first. Disable the library handlers completely while Highlight + Note is
    // active, then restore them without rebuilding the PDF.
    const engine = flipRef.current;
    if (engine) {
      const settings = engine.getSettings() as unknown as {
        useMouseEvents: boolean; showPageCorners: boolean; disableFlipByClick: boolean;
      };
      const ui = engine.getUI() as unknown as { removeHandlers?: () => void; setHandlers?: () => void };
      ui.removeHandlers?.();
      settings.useMouseEvents = !annotationsOpen && zoom <= 1;
      settings.showPageCorners = false;
      settings.disableFlipByClick = annotationsOpen;
      ui.setHandlers?.();
    }
  }, [annotationsOpen, ready, zoom]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    mount.querySelectorAll(".reader-saved-highlight,.reader-pending-highlight").forEach((node) => node.remove());

    for (const item of annotations) {
      const layer = mount.querySelector<HTMLElement>(`.reader-page-annotation-layer[data-page="${item.page}"]`);
      if (!layer) continue;
      for (const rect of parsedRects(item.rects)) {
        const mark = document.createElement("button");
        mark.type = "button";
        mark.className = `reader-direct-highlight reader-saved-highlight is-${item.color}${selectedAnnotation?.id === item.id ? " is-selected" : ""}`;
        const customColor = customHighlightColor(item.color);
        if (customColor) {
          mark.style.backgroundColor = `${customColor}52`;
          mark.style.borderColor = `${customColor}70`;
        }
        mark.dataset.annotationId = item.id;
        mark.setAttribute("aria-label", item.note ? `Highlight: ${item.note}` : "Highlight");
        mark.title = item.note || "Highlight + Note";
        mark.style.left = `${rect.x * 100}%`;
        mark.style.top = `${rect.y * 100}%`;
        mark.style.width = `${rect.width * 100}%`;
        mark.style.height = `${rect.height * 100}%`;
        const blockFlip = (event: Event) => {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
        };
        const blockFlipStart = (event: Event) => {
          event.stopPropagation();
          event.stopImmediatePropagation();
          // Keep the native right-click/contextmenu alive while still preventing
          // StPageFlip from seeing the pointer sequence.
          if (!(event instanceof MouseEvent) || event.button === 0) event.preventDefault();
        };
        ["pointerdown", "mousedown", "touchstart"].forEach((eventName) => {
          mark.addEventListener(eventName, blockFlipStart, { capture: true, passive: false });
        });
        mark.addEventListener("pointerup", (event) => {
          if (event.button !== 0) return;
          blockFlip(event);
          setPendingHighlight(null);
          setSelectedAnnotation(item);
        }, true);
        mark.addEventListener("click", (event) => {
          blockFlip(event);
          setPendingHighlight(null);
          setSelectedAnnotation(item);
        }, true);
        mark.addEventListener("contextmenu", (event) => {
          blockFlip(event);
          setHighlightContextMenu({ id: item.id, x: event.clientX, y: event.clientY });
        }, true);
        layer.appendChild(mark);
      }
    }

    if (pendingHighlight) {
      const layer = mount.querySelector<HTMLElement>(`.reader-page-annotation-layer[data-page="${pendingHighlight.page}"]`);
      if (layer) {
        const mark = document.createElement("div");
        mark.className = "reader-direct-highlight reader-pending-highlight";
        const rect = pendingHighlight.rect;
        mark.style.left = `${rect.x * 100}%`;
        mark.style.top = `${rect.y * 100}%`;
        mark.style.width = `${rect.width * 100}%`;
        mark.style.height = `${rect.height * 100}%`;
        layer.appendChild(mark);
      }
    }
  }, [annotations, pendingHighlight, ready, selectedAnnotation?.id]);

  async function deleteAnnotation(id: string) {
    setHighlightContextMenu(null);
    const response = await fetch(`/api/reader-annotations?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      setToolMessage("Не удалось удалить highlight.");
      return;
    }
    if (selectedAnnotation?.id === id) setSelectedAnnotation(null);
    setAnnotations((current) => current.filter((item) => item.id !== id));
  }

  useEffect(() => {
    if (!ready || !isAuthenticated || totalPages <= 0) return;
    let active = true;
    const timer = window.setTimeout(() => {
      const payload = { bookId, contentId, lastPage: position.page, totalPages };
      saveQueue.current = saveQueue.current
        .then(async () => {
          const response = await fetch("/api/reading-progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          if (active) setSaveError(false);
        })
        .catch(() => { if (active) setSaveError(true); });
    }, 350);
    return () => { active = false; window.clearTimeout(timer); };
  }, [ready, isAuthenticated, bookId, contentId, position.page, totalPages]);

  useEffect(() => () => {
    speechRunIdRef.current += 1;
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  const visibleEnd = Math.min(totalPages, position.page + (position.landscape ? 1 : 0));
  // Opening the AI rail can shrink a two-page spread into a single page.
  const openingSpread = aiOpeningSpread && position.page >= aiOpeningSpread.first && position.page <= aiOpeningSpread.last
    ? aiOpeningSpread
    : null;
  const progressPercent = ready && totalPages > 0 ? Math.round((visibleEnd / totalPages) * 100) : 0;
  const canGoBack = ready && !busy && position.page > 1;
  const canGoNext = ready && !busy && visibleEnd < totalPages;

  useEffect(() => {
    const loader = pageLoaderRef.current;
    if (!loader || !ready || !pageWidth || busy) return;
    const { show } = loader;
    let active = true;
    const first = Math.max(1, position.page - 2);
    const last = Math.min(totalPages, visibleEnd + 2);
    const width = rasterWidth(pageWidth, zoom);
    loader.retain(first, last);

    async function prepareVisiblePages() {
      const render = (page: number, prefetch = false) => show(page, width, prefetch).catch(() => {
        if (active && page >= position.page && page <= visibleEnd) {
          setToolMessage("Не удалось загрузить страницу. Обновите книгу и попробуйте снова.");
        }
      });
      await Promise.all(Array.from({ length: visibleEnd - position.page + 1 }, (_, i) => render(position.page + i)));
      for (const page of [visibleEnd + 1, position.page - 1, visibleEnd + 2, position.page - 2]) {
        if (!active) break;
        if (page >= first && page <= last) await render(page, true);
      }
    }
    const timer = window.setTimeout(() => void prepareVisiblePages(), 90);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [busy, pageWidth, position.page, ready, totalPages, visibleEnd, zoom]);

  const getPageImage = useCallback(async (pageNumber: number) => {
    const loader = pageLoaderRef.current;
    if (!loader) throw new Error("Страница PDF ещё не готова.");
    return readerPageFile(await loader.raster(pageNumber, OCR_IMAGE_WIDTH), pageNumber);
  }, []);

  function getSelectionImage(selection: NonNullable<typeof pendingHighlight>) {
    const loader = pageLoaderRef.current;
    if (!loader) return Promise.reject(new Error("Страница PDF ещё не готова."));
    return loader.raster(selection.page, 2200).then((image) =>
      cropReaderPage(image, selection.page, selection.rect, selection.aspect));
  }

  async function attachSelection(selection: NonNullable<typeof pendingHighlight>) {
    if (attachingSelection) return;
    setAttachingSelection(true);
    setToolMessage("");
    try {
      const file = await getSelectionImage(selection);
      setSelectionAttachment({ page: selection.page, file });
      setAiOpen(true);
      setPendingHighlight((current) => current === selection ? null : current);
    } catch (cause) {
      setToolMessage(cause instanceof Error ? cause.message : "Не удалось прикрепить выделение.");
    } finally {
      setAttachingSelection(false);
    }
  }

  const ensurePageText = useCallback(async (pageNumber: number) => {
    const loader = pageLoaderRef.current;
    if (!loader) return "";
    await loader.readText(pageNumber).catch(() => {});
    if (pageLoaderRef.current !== loader) return "";
    const existing = pageTextsRef.current[pageNumber]?.trim() ?? "";
    const wantsMathUpgrade = Boolean(
      existing
      && pageMathHintsRef.current[pageNumber]
      && !mathOcrAttemptedRef.current.has(pageNumber)
    );
    if (existing && !wantsMathUpgrade) return existing;

    const inFlight = ocrJobsRef.current.get(pageNumber);
    if (inFlight) return inFlight;

    const job = (async () => {
      const nativeText = pageTextsRef.current[pageNumber]?.trim() ?? "";
      const preferMath = !nativeText || Boolean(pageMathHintsRef.current[pageNumber]);
      if (preferMath) mathOcrAttemptedRef.current.add(pageNumber);

      try {
        const form = new FormData();
        form.set("image", await getPageImage(pageNumber));
        if (preferMath) form.set("preferMath", "1");

        const response = await fetch("/api/reader-ocr", { method: "POST", body: form });
        const payload = (await response.json().catch(() => ({}))) as { text?: string; engine?: string; mathText?: string; error?: string };
        if (!response.ok || !payload.text?.trim()) {
          if (nativeText) return nativeText;
          throw new Error(payload.error || `OCR страницы ${pageNumber} не удался.`);
        }

        const ocrText = payload.text.trim();
        const mathText = payload.mathText?.trim() ?? "";
        const hasRecognizedMath = payload.engine === "openai-vision" && preferMath && /\$[^$]+\$/.test(ocrText);
        const baseText = hasRecognizedMath ? ocrText : nativeText || ocrText;
        const finalText = mathText && !baseText.includes(mathText)
          ? `${baseText}\n\n[LaTeX OCR]\n${mathText}`
          : baseText;
        if (finalText !== pageTextsRef.current[pageNumber]) {
          pageTextsRef.current[pageNumber] = finalText;
        }
        return finalText;
      } catch (cause) {
        if (nativeText) {
          console.warn("Math OCR enhancement failed; keeping native PDF text", pageNumber, cause);
          return nativeText;
        }
        throw cause;
      }
    })().finally(() => ocrJobsRef.current.delete(pageNumber));

    ocrJobsRef.current.set(pageNumber, job);
    return job;
  }, [getPageImage]);

  const prepareAiText = useCallback(async (scope: "page" | "document", requestedPage?: number) => {
    if (scope === "page") {
      const targetPage = normalizePage(requestedPage ?? position.page, totalPages);
      try {
        return await ensurePageText(targetPage);
      } catch (cause) {
        console.error("OCR page failed", targetPage, cause);
        return "";
      }
    }

    const output: string[] = [];
    // Two OCR jobs at a time avoids saturating CPU/GPU while still preparing a
    // scanned document much faster than a fully sequential pass.
    for (let start = 1; start <= totalPages; start += 2) {
      const pageNumbers = [start, start + 1].filter((pageNumber) => pageNumber <= totalPages);
      const texts = await Promise.all(pageNumbers.map(async (pageNumber) => {
        try { return await ensurePageText(pageNumber); } catch (cause) { console.error("OCR page failed", pageNumber, cause); return ""; }
      }));
      pageNumbers.forEach((pageNumber, index) => {
        const text = texts[index]?.trim();
        if (text) output.push(`[Страница ${pageNumber}]\n${text}`);
      });
    }
    return output.join("\n\n");
  }, [ensurePageText, position.page, totalPages]);

  function goToPage(requested: number) {
    if (!ready || !Number.isInteger(requested) || requested < 1 || requested > totalPages) return;
    const engine = flipRef.current;
    if (engine) {
      engine.turnToPage(requested - 1);
      setPosition({ page: engine.getCurrentPageIndex() + 1, landscape: engine.getOrientation() === "landscape" });
    } else if (totalPages === 1) {
      setPosition({ page: 1, landscape: false });
    }
  }

  function turnPage(direction: "previous" | "next") {
    const engine = flipRef.current;
    if (!ready) return;
    if (!engine) { setPosition({ page: 1, landscape: false }); return; }
    if (engine.getState() !== "read") return;
    if (direction === "previous" && position.page > 1) engine.flipPrev();
    if (direction === "next" && visibleEnd < totalPages) engine.flipNext();
  }

  function stopSpeech() {
    speechRunIdRef.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    }
    setSpeaking(false);
  }

  async function toggleSpeech() {
    if (!("speechSynthesis" in window)) {
      setToolMessage("Браузер не поддерживает чтение вслух.");
      return;
    }
    if (speaking) {
      stopSpeech();
      return;
    }

    setToolMessage("Подготовка текста…");
    let text = "";
    try {
      text = await prepareAiText("page");
    } catch (cause) {
      setToolMessage(cause instanceof Error ? cause.message : "OCR не смог подготовить страницу.");
      return;
    }
    if (!text.trim()) {
      setToolMessage("На странице нет доступного текста для чтения. OCR не смог распознать изображение.");
      return;
    }

    const synth = window.speechSynthesis;
    const locale = language === "en" ? "en-US" : language === "vi" ? "vi-VN" : language === "ru" ? "ru-RU" : language || "ru-RU";
    const voices = await waitForVoices(synth);
    const languagePrefix = locale.toLowerCase().split("-")[0];
    const voice = voices.find((item) => item.lang.toLowerCase() === locale.toLowerCase())
      ?? voices.find((item) => item.lang.toLowerCase().startsWith(languagePrefix));
    const parts = splitSpeechText(text);
    if (!parts.length) return;

    const runId = speechRunIdRef.current + 1;
    speechRunIdRef.current = runId;
    synth.cancel();
    synth.resume();
    setSpeaking(true);
    setToolMessage(voice ? `Чтение вслух · ${voice.name}` : "Чтение вслух");

    const speak = (index: number) => {
      if (speechRunIdRef.current !== runId) return;
      if (index >= parts.length) {
        setSpeaking(false);
        setToolMessage("");
        return;
      }
      const utterance = new SpeechSynthesisUtterance(parts[index]);
      utterance.rate = speechRate;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = locale;
      if (voice) utterance.voice = voice;
      utterance.onend = () => window.setTimeout(() => speak(index + 1), 30);
      utterance.onerror = (event) => {
        if (event.error !== "canceled" && event.error !== "interrupted") {
          setToolMessage(`Не удалось воспроизвести речь (${event.error}). Проверьте системные голоса Edge/Windows.`);
        }
        if (speechRunIdRef.current === runId) setSpeaking(false);
      };
      synth.resume();
      synth.speak(utterance);
    };

    // Chromium can drop the first utterance immediately after cancel(). A short
    // user-gesture-adjacent delay plus resume() is significantly more reliable.
    window.setTimeout(() => speak(0), 120);
  }

  function makeSearchSnippet(text: string, query: string) {
    const normalized = text.replace(/\s+/g, " ").trim();
    const index = normalized.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
    if (index < 0) return normalized.slice(0, 130);
    const start = Math.max(0, index - 52);
    const end = Math.min(normalized.length, index + query.length + 72);
    return `${start > 0 ? "…" : ""}${normalized.slice(start, end)}${end < normalized.length ? "…" : ""}`;
  }

  async function searchPdf(query: string) {
    const clean = query.trim();
    if (!clean) {
      setSearchHits([]);
      setSearchIndex(0);
      return;
    }
    setSearchBusy(true);
    setToolMessage("");
    try {
      const lowered = clean.toLocaleLowerCase();
      const hits: ReaderSearchHit[] = [];
      // Search native PDF text first. OCR is used only as a traditional
      // Tesseract fallback for pages that do not expose a text layer.
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        let text = pageTextsRef.current[pageNumber]?.trim() ?? "";
        if (!text) {
          try { text = await ensurePageText(pageNumber); } catch { text = ""; }
        }
        if (!text) continue;
        const haystack = text.toLocaleLowerCase();
        let count = 0;
        let from = 0;
        while (from < haystack.length) {
          const index = haystack.indexOf(lowered, from);
          if (index < 0) break;
          count += 1;
          from = index + Math.max(1, lowered.length);
        }
        if (count) hits.push({ page: pageNumber, count, snippet: makeSearchSnippet(text, clean) });
      }
      setSearchHits(hits);
      setSearchIndex(0);
      if (hits[0]) goToPage(hits[0].page);
    } finally {
      setSearchBusy(false);
    }
  }

  function moveSearchHit(direction: -1 | 1) {
    if (!searchHits.length) return;
    const next = (searchIndex + direction + searchHits.length) % searchHits.length;
    setSearchIndex(next);
    goToPage(searchHits[next].page);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await sectionRef.current?.requestFullscreen();
    } catch {
      // Optional browser capability.
    }
  }

  function toggleAnnotations() {
    const next = !annotationsOpen;
    annotationModeRef.current = next;
    setAnnotationsOpen(next);
    if (!next) {
      setPendingHighlight(null);
      setSelectedAnnotation(null);
      setHighlightContextMenu(null);
    }
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(fitBookToStage));
    return () => cancelAnimationFrame(frame);
  }, [aiOpen, aiRailWidth, notesListOpen, fitBookToStage]);

  const noteItems = useMemo(() => annotations.filter((item) => Boolean(item.note?.trim())), [annotations]);
  const noteRailCompression = aiOpen ? Math.max(0, aiRailWidth - 320) : 0;
  const leftRailSpace = notesListOpen ? Math.max(0, 226 - noteRailCompression) : 0;

  const buttonClass = "rounded-full border border-[var(--surface-border)] px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <section ref={sectionRef} data-testid="pdf-reader-shell" data-reader-build={READER_BUILD} className={`reader-shell concept-panel mx-auto w-full min-w-0 max-w-[1680px] space-y-3 rounded-[20px] p-2 text-[var(--text-primary)] sm:space-y-5 sm:rounded-[32px] sm:p-5 ${fullscreenActive ? "is-fullscreen" : ""}`}>
      <header className="reader-shell-header flex flex-wrap items-end justify-between gap-2 border-b border-[var(--surface-border)] px-2 pb-3 sm:gap-4 sm:px-0 sm:pb-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--text-secondary)] sm:text-sm">Reading studio</p>
          <h1 className="mt-1 break-words text-xl font-semibold text-[var(--text-primary)] sm:mt-2 sm:text-3xl">
            <Link href={`/books/${slug}`} className="transition hover:text-[var(--accent-text)]">{title}</Link>
          </h1>
          <p className="mt-2 hidden text-xs text-[var(--text-muted)] sm:block">Нажмите на название, чтобы вернуться к карточке книги.</p>
        </div>
        <p aria-live="polite" className="text-sm text-[var(--text-secondary)]">
          {ready ? `Страница ${position.page}${visibleEnd > position.page ? `–${visibleEnd}` : ""} из ${totalPages} · ${progressPercent}%` : error ? "Ошибка загрузки" : "Подготовка книги..."}
        </p>
      </header>

      <div role="progressbar" aria-label="Прогресс чтения" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent} className="reader-shell-progress h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div className="h-full rounded-full bg-[var(--accent-strong)] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
      </div>

      {!ready && !error ? (
        <div role="status" className="mx-auto max-w-md py-3 text-center text-sm text-[var(--text-secondary)]">
          Загрузка страницы…
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="space-y-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-5">
          <p className="font-medium text-[var(--danger-text)]">Не удалось открыть книгу</p>
          <p className="break-words text-sm text-[var(--danger-text)]">{error}</p>
          <button type="button" className={buttonClass} onClick={() => { setError(""); setRetryCount((count) => count + 1); }}>Повторить</button>
        </div>
      ) : null}

      <div className="reader-fullscreen-topbar">
        <Link href={`/books/${slug}`} className="reader-fullscreen-title">{title}</Link>
        <span>{position.page}{visibleEnd > position.page ? `–${visibleEnd}` : ""} / {totalPages}</span>
      </div>

      <div
        className="reader-workspace"
        style={{
          paddingLeft: `${leftRailSpace}px`,
          paddingRight: `${aiOpen ? aiRailWidth + 12 : 0}px`
        }}
      >
      <div
        className={`pdf3d-stage ${annotationsOpen ? "is-annotation-mode" : ""} ${zoom > 1 ? "is-zoomed" : ""}`}
        style={{ "--reader-zoom": zoom } as CSSProperties}
        tabIndex={ready ? 0 : -1}
        aria-label={annotationsOpen ? "Режим Highlight + Note" : zoom > 1 ? "Книга. Стрелки прокручивают увеличенную страницу." : "Книга. Используйте стрелки влево и вправо."}
        onKeyDown={(event) => {
          if (annotationsOpen || zoom > 1) return;
          if (event.key === "ArrowLeft") { event.preventDefault(); turnPage("previous"); }
          if (event.key === "ArrowRight") { event.preventDefault(); turnPage("next"); }
        }}
      >
        <div ref={mountRef} className="pdf3d-mount" />
      </div>

      <ReaderNotesRail
        open={notesListOpen}
        dimmed={aiOpen && aiRailWidth > 360}
        notes={noteItems}
        onOpenNote={(note) => {
          goToPage(note.page);
          setPendingHighlight(null);
        }}
      />

      <ReaderAiPanel
        open={aiOpen}
        title={title}
        bookId={bookId}
        contentId={contentId}
        page={position.landscape ? position.page : openingSpread?.first ?? position.page}
        lastVisiblePage={position.landscape ? visibleEnd : openingSpread?.last ?? position.page}
        getText={prepareAiText}
        selectionAttachment={selectionAttachment}
        onSelectionHandled={() => setSelectionAttachment(null)}
        onClose={() => setAiOpen(false)}
        onWidthChange={setAiRailWidth}
      />
      </div>

      <div className="reader-shell-nav flex justify-center gap-3">
        <button type="button" className={buttonClass} disabled={!canGoBack} onClick={() => turnPage("previous")}>← Назад</button>
        <button type="button" className={`${buttonClass} bg-[var(--accent-soft)]`} disabled={!canGoNext} onClick={() => turnPage("next")}>Вперёд →</button>
      </div>

      {saveError ? <p role="status" className="reader-shell-status text-center text-sm text-[var(--warning-text)]">Не удалось сохранить прогресс чтения.</p> : null}
      {toolMessage ? <p role="status" className="reader-shell-status text-center text-sm text-[var(--text-secondary)]">{toolMessage}</p> : null}

      <ReaderFloatingToolbar
        currentPage={position.page}
        totalPages={totalPages}
        zoom={zoom}
        canPrevious={canGoBack}
        canNext={canGoNext}
        speaking={speaking}
        aiOpen={aiOpen}
        aiEnabled={aiEnabled}
        annotationsOpen={annotationsOpen}
        notesListOpen={notesListOpen}
        searchOpen={searchOpen}
        onPrevious={() => turnPage("previous")}
        onNext={() => turnPage("next")}
        onGoToPage={goToPage}
        onZoomOut={() => setZoom((value) => clampZoom(value - 0.1))}
        onZoomIn={() => setZoom((value) => clampZoom(value + 0.1))}
        onResetZoom={() => setZoom(1)}
        onToggleSpeech={() => void toggleSpeech()}
        onToggleAi={() => {
          if (!aiOpen) {
            setAiOpeningSpread(visibleEnd > position.page ? { first: position.page, last: visibleEnd } : null);
          }
          setAiOpen(!aiOpen);
        }}
        onToggleAnnotations={toggleAnnotations}
        onToggleNotes={() => setNotesListOpen((value) => !value)}
        onToggleSearch={() => setSearchOpen((value) => !value)}
        onFullscreen={() => void toggleFullscreen()}
      />

      <ReaderSearchPanel
        open={searchOpen}
        busy={searchBusy}
        hits={searchHits}
        activeIndex={searchIndex}
        onSearch={(query) => void searchPdf(query)}
        onPrevious={() => moveSearchHit(-1)}
        onNext={() => moveSearchHit(1)}
        onClose={() => setSearchOpen(false)}
      />

      {pendingHighlight && !editingHighlight ? createPortal(selectionSearch ? (
        <ReaderSelectionSearch {...selectionSearch} onClose={() => setSelectionSearch(null)} />
      ) : (
        <div className="reader-highlight-context-menu reader-selection-actions"
          style={{ left: Math.max(8, pendingHighlight.anchor.x), top: Math.max(8, pendingHighlight.anchor.y) }}
          onKeyDown={(event) => { if (event.key === "Escape") setPendingHighlight(null); }}>
          {aiEnabled ? <button type="button" disabled={attachingSelection} onClick={() => void attachSelection(pendingHighlight)}>+ to AI</button> : null}
          <button type="button" onClick={() => setSelectionSearch({
            anchor: pendingHighlight.anchor,
            getImage: () => getSelectionImage(pendingHighlight),
            getText: () => pageLoaderRef.current?.selectionText(pendingHighlight.page, pendingHighlight.rect, pendingHighlight.aspect) ?? Promise.resolve("")
          })}>Поиск</button>
          <button type="button" onClick={() => setEditingHighlight(true)}>Заметка</button>
          <button type="button" onClick={() => setPendingHighlight(null)}>Отмена</button>
        </div>
      ), fullscreenActive && sectionRef.current ? sectionRef.current : document.body) : null}

      <ReaderAnnotationsPanel
        open={Boolean((pendingHighlight && editingHighlight) || selectedAnnotation)}
        bookId={bookId}
        contentId={contentId}
        page={pendingHighlight?.page ?? selectedAnnotation?.page ?? position.page}
        pendingHighlight={pendingHighlight}
        selectedAnnotation={selectedAnnotation}
        onClose={() => { setPendingHighlight(null); setSelectedAnnotation(null); }}
        onSaved={(annotation) => {
          setAnnotations((current) => {
            const exists = current.some((item) => item.id === annotation.id);
            return exists ? current.map((item) => item.id === annotation.id ? annotation : item) : [...current, annotation];
          });
          setPendingHighlight(null);
          setSelectedAnnotation(null);
        }}
      />

      {highlightContextMenu ? (
        <div
          className="reader-highlight-context-menu"
          style={{ left: Math.min(highlightContextMenu.x, window.innerWidth - 230), top: Math.min(highlightContextMenu.y, window.innerHeight - 70) }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={() => void deleteAnnotation(highlightContextMenu.id)}>Удалить highlight + note</button>
        </div>
      ) : null}

      <style jsx global>{`
        .pdf3d-stage { width:100%; min-width:0; height:min(78dvh,calc(100dvh - 155px)); min-height:420px; overflow:auto; border-radius:24px; background:radial-gradient(ellipse at 50% 20%,var(--accent-soft),transparent 66%),var(--surface-2); overscroll-behavior:contain; }
        .pdf3d-stage:focus-visible { outline:2px solid var(--accent-strong); outline-offset:4px; }
        .pdf3d-stage.is-annotation-mode { box-shadow: inset 0 0 0 2px var(--accent-border); }
        .pdf3d-mount { width:max-content; min-width:100%; min-height:100%; padding:12px; display:grid; place-items:center; position:relative; }
        .pdf3d-mount::before { content:""; position:absolute; left:50%; bottom:5%; width:min(72%,980px); height:34px; transform:translateX(-50%); border-radius:50%; background:rgba(0,0,0,.34); filter:blur(22px); pointer-events:none; }
        .pdf3d-book-clip { position:relative; width:calc(var(--book-width, 0px) * var(--reader-zoom, 1)); height:calc(var(--book-height, 0px) * var(--reader-zoom, 1)); overflow:hidden; isolation:isolate; z-index:1; }
        .pdf3d-book { visibility:hidden; margin:0; position:relative; z-index:1; }
        .pdf3d-book-clip > .pdf3d-book { transform:scale(var(--reader-zoom, 1)); transform-origin:top left; }
        .pdf3d-stage.is-zoomed .pdf3d-book { touch-action:pan-x pan-y; }
        /* Do not style StPageFlip private wrapper/item nodes. The library uses
           transformed overflow outside the host while composing a spread.
           Clipping those private nodes can make the whole book disappear. */
        .pdf3d-book .stf__outerShadow, .pdf3d-book .stf__innerShadow, .pdf3d-book .stf__hardShadow, .pdf3d-book .stf__hardInnerShadow { display:none !important; opacity:0 !important; }
        .pdf3d-sheet { position:relative; overflow:hidden; background:#fff; box-shadow:inset 0 0 12px rgba(0,0,0,.04); }
        .pdf3d-sheet img { display:block; width:100%; height:100%; object-fit:contain; background:#fff; user-select:none; pointer-events:none; -webkit-user-drag:none; }
        .pdf3d-sheet img[hidden] { display:none; }
        .pdf3d-single .pdf3d-sheet { height:100%; }
        .pdf3d-single .pdf3d-sheet img { height:100%; object-fit:contain; }
        .reader-page-annotation-layer { position:absolute; inset:0; z-index:12; pointer-events:none; touch-action:none; }
        .reader-annotation-mode .reader-page-annotation-layer { pointer-events:auto; cursor:crosshair; }
        .reader-direct-highlight { position:absolute; border:0; padding:0; border-radius:4px; background:rgba(250,204,21,.32); border:1px solid rgba(202,138,4,.26); mix-blend-mode:multiply; pointer-events:none; }
        .reader-direct-highlight.is-cyan { background:rgba(34,211,238,.28); border-color:rgba(8,145,178,.28); }
        .reader-direct-highlight.is-rose { background:rgba(251,113,133,.28); border-color:rgba(225,29,72,.25); }
        .reader-saved-highlight { pointer-events:auto; cursor:pointer; }
        .reader-saved-highlight.is-selected { outline:2px solid var(--accent-strong); outline-offset:2px; }
        .reader-direct-highlight--draft,.reader-pending-highlight { background:rgba(var(--accent-rgb),.26); border:2px solid var(--accent-strong); mix-blend-mode:multiply; }
        .reader-fullscreen-topbar { display:none; }
        .reader-shell:fullscreen { width:100vw !important; max-width:none !important; height:100dvh; min-height:100dvh; margin:0; padding:14px 16px 16px !important; border:0; border-radius:0 !important; display:grid; grid-template-rows:48px minmax(0,1fr); gap:10px; overflow:hidden; background:var(--surface-1); }
        .reader-shell:fullscreen > * { margin-top:0 !important; }
        .reader-shell:fullscreen .reader-shell-header,
        .reader-shell:fullscreen .reader-shell-progress,
        .reader-shell:fullscreen .reader-shell-nav,
        .reader-shell:fullscreen .reader-shell-status { display:none !important; }
        .reader-shell:fullscreen .reader-fullscreen-topbar { display:flex; min-width:0; align-items:center; justify-content:space-between; gap:16px; border-bottom:1px solid rgba(255,255,255,.08); padding:0 6px 8px; color:var(--text-secondary); }
        .reader-fullscreen-title { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-primary); font-family:Georgia,serif; font-size:1.08rem; font-weight:700; }
        .reader-shell:fullscreen .reader-workspace { height:100%; min-height:0; border-radius:22px; }
        .reader-shell:fullscreen .pdf3d-stage { height:100%; min-height:0; border-radius:20px; overflow:auto; }
        @media(max-width:760px){
          .pdf3d-stage { height:clamp(240px,min(calc((100vw - 60px) * var(--page-aspect, 1.414) + 28px),calc(100dvh - 158px)),740px); min-height:0; border-radius:14px; }
          .reader-shell:fullscreen .reader-workspace { padding-bottom:calc(112px + env(safe-area-inset-bottom)); }
        }
      `}</style>
    </section>
  );
}
