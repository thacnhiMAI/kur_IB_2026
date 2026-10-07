"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageFlip } from "page-flip";
import { pdfjs } from "react-pdf";

import { ReaderAiPanel } from "@/components/reader/reader-ai-panel";
import { ReaderFloatingToolbar } from "@/components/reader/reader-floating-toolbar";
import { ReaderAnnotationsPanel } from "@/components/reader/reader-annotations-panel";
import { ReaderNotesRail } from "@/components/reader/reader-notes-rail";
import { ReaderSearchPanel, type ReaderSearchHit } from "@/components/reader/reader-search-panel";
import {
  APP_SETTINGS_EVENT,
  APP_SETTINGS_STORAGE_KEY,
  readAppSettingsFromBrowser
} from "@/lib/preferences/settings";

type PdfFlipReaderProps = {
  title: string;
  slug: string;
  language: string;
  fileUrl: string;
  bookId: string;
  contentId: string | null;
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
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const PAGE_WIDTH = 700;
const IMAGE_WIDTH = 1400;
const READER_BUILD = "reader-v14";

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
  const pageImageUrlsRef = useRef<Record<number, string>>({});
  const ocrJobsRef = useRef<Map<number, Promise<string>>>(new Map());
  const speechRunIdRef = useRef(0);
  const annotationModeRef = useRef(false);
  const annotationsRef = useRef<AnnotationRecord[]>([]);
  const pageAspectRef = useRef(Math.SQRT2);
  const currentPageRef = useRef(initialPage);

  const [totalPages, setTotalPages] = useState(0);
  const [preparedPages, setPreparedPages] = useState(0);
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
  const [aiEnabled, setAiEnabled] = useState(true);
  const [annotationsOpen, setAnnotationsOpen] = useState(false);
  const [notesListOpen, setNotesListOpen] = useState(true);
  const [aiRailWidth, setAiRailWidth] = useState(340);
  const [pendingHighlight, setPendingHighlight] = useState<{ page: number; rect: HighlightRect } | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationRecord | null>(null);
  const [highlightContextMenu, setHighlightContextMenu] = useState<HighlightContextMenu>(null);
  const [annotations, setAnnotations] = useState<AnnotationRecord[]>([]);
  const [textRevision, setTextRevision] = useState(0);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchHits, setSearchHits] = useState<ReaderSearchHit[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);

  useEffect(() => {
    console.info(`[reader] build=${READER_BUILD}`);
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
    if (!mount || !stage) return;

    const engine = flipRef.current;
    const ratio = Math.max(0.5, pageAspectRef.current || Math.SQRT2);
    const isFullscreen = document.fullscreenElement === sectionRef.current;
    const horizontalPadding = isFullscreen ? 20 : 32;
    const verticalPadding = isFullscreen ? 16 : 28;
    const availableWidth = Math.max(280, stage.clientWidth - horizontalPadding);
    const availableHeight = Math.max(280, stage.clientHeight - verticalPadding);
    const wantsSpread = availableWidth >= 820;
    const widthBudget = wantsSpread
      ? Math.max(220, (availableWidth - 20) / 2)
      : Math.max(220, availableWidth - 12);
    const fittedWidth = Math.max(220, Math.floor(Math.min(widthBudget, availableHeight / ratio)));
    const fittedHeight = Math.max(280, Math.floor(fittedWidth * ratio));

    const host = mount.querySelector<HTMLElement>(".pdf3d-book");
    const clip = mount.querySelector<HTMLElement>(".pdf3d-book-clip");
    if (!host || !clip) return;

    if (!engine) {
      host.style.width = `${fittedWidth}px`;
      clip.style.width = `${fittedWidth}px`;
      clip.style.height = `${fittedHeight}px`;
      const sheet = host.querySelector<HTMLElement>(".pdf3d-sheet");
      if (sheet) sheet.style.height = `${fittedHeight}px`;
      return;
    }

    const settings = engine.getSettings() as unknown as {
      width: number; height: number; minWidth: number; maxWidth: number;
      minHeight: number; maxHeight: number;
    };
    settings.width = fittedWidth;
    settings.height = fittedHeight;
    settings.minWidth = Math.min(220, fittedWidth);
    settings.maxWidth = fittedWidth;
    settings.minHeight = Math.min(Math.floor(220 * ratio), fittedHeight);
    settings.maxHeight = fittedHeight;

    const pageColumns = engine.getOrientation() === "portrait" ? 1 : 2;
    host.style.width = `${fittedWidth * pageColumns}px`;
    host.style.height = `${fittedHeight}px`;
    host.style.minWidth = `${settings.minWidth * pageColumns}px`;
    host.style.minHeight = `${settings.minHeight}px`;
    host.style.maxWidth = `${fittedWidth * pageColumns}px`;
    host.style.maxHeight = `${fittedHeight}px`;
    clip.style.width = `${fittedWidth * pageColumns}px`;
    clip.style.height = `${fittedHeight}px`;
    engine.getUI().setOrientationStyle(engine.getOrientation());
    engine.update();
  }, []);

  useEffect(() => {
    let frame = 0;
    const scheduleFit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => requestAnimationFrame(fitBookToStage));
    };
    const syncFullscreen = () => {
      const engine = flipRef.current;
      initialPageRef.current = engine ? engine.getCurrentPageIndex() + 1 : currentPageRef.current;
      setFullscreenActive(document.fullscreenElement === sectionRef.current);
      scheduleFit();
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    window.addEventListener("resize", scheduleFit, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("fullscreenchange", syncFullscreen);
      window.removeEventListener("resize", scheduleFit);
    };
  }, [fitBookToStage]);

  useEffect(() => {
    function syncSettings() {
      const settings = readAppSettingsFromBrowser();
      setZoom(clampZoom(settings.readerZoom));
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    let renderTask: { cancel: () => void } | null = null;
    const objectUrls: string[] = [];

    const clip = document.createElement("div");
    clip.className = "pdf3d-book-clip";
    const host = document.createElement("div");
    host.className = "pdf3d-book";
    clip.appendChild(host);
    mount.appendChild(clip);

    pageTextsRef.current = {};
    pageImageUrlsRef.current = {};
    ocrJobsRef.current.clear();
    mathOcrAttemptedRef.current.clear();
    pageMathHintsRef.current = {};
    setTextRevision((value) => value + 1);
    setReady(false);
    setBusy(false);
    setError("");
    setToolMessage("");
    setSaveError(false);
    setTotalPages(0);
    setPreparedPages(0);
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
        if (highlight.width > 0.008 && highlight.height > 0.006) {
          setSelectedAnnotation(null);
          setPendingHighlight({ page: pageNumber, rect: highlight });
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
        loadingTask = pdfjs.getDocument({ url: fileUrl.trim() });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        if (pdf.numPages < 1) throw new Error("PDF не содержит страниц.");
        setTotalPages(pdf.numPages);

        const sheets: HTMLDivElement[] = [];
        let pageHeight = Math.round(PAGE_WIDTH * Math.SQRT2);

        for (let number = 1; number <= pdf.numPages; number += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(number);
          if (cancelled) return;
          const originalViewport = page.getViewport({ scale: 1 });
          if (number === 1) pageHeight = Math.round(PAGE_WIDTH * (originalViewport.height / originalViewport.width));

          try {
            const textContent = await page.getTextContent();
            const extracted = extractNativePdfText(textContent.items as unknown[]);
            pageTextsRef.current[number] = extracted.text;
            pageMathHintsRef.current[number] = extracted.hasMath;
          } catch {
            pageTextsRef.current[number] = "";
            pageMathHintsRef.current[number] = false;
          }

          const viewport = page.getViewport({ scale: IMAGE_WIDTH / originalViewport.width });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          let blob: Blob;
          try {
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Браузер не поддерживает Canvas.");
            const task = page.render({ canvas, canvasContext: context, viewport, background: "#ffffff" });
            renderTask = task;
            await task.promise;
            renderTask = null;
            if (cancelled) return;
            blob = await canvasToBlob(canvas);
          } finally {
            renderTask = null;
            canvas.width = 0;
            canvas.height = 0;
            page.cleanup();
          }
          if (cancelled) return;

          const imageUrl = URL.createObjectURL(blob);
          pageImageUrlsRef.current[number] = imageUrl;
          objectUrls.push(imageUrl);
          const image = new Image();
          image.alt = `Страница ${number}`;
          image.draggable = false;
          image.src = imageUrl;
          await image.decode();
          if (cancelled) return;

          const sheet = document.createElement("div");
          sheet.className = "pdf3d-sheet";
          sheet.dataset.density = "soft";
          sheet.dataset.pageNumber = String(number);
          sheet.setAttribute("aria-label", `Страница ${number}`);
          sheet.appendChild(image);
          installAnnotationLayer(sheet, number);
          sheets.push(sheet);
          host.appendChild(sheet);
          setPreparedPages(number);
        }

        if (cancelled) return;
        setTextRevision((value) => value + 1);

        // 100% means "fit the complete page/spread inside the visible reader",
        // not a 700px-wide physical page that can extend below the viewport.
        const stage = mount.closest<HTMLElement>(".pdf3d-stage");
        const stageRect = stage?.getBoundingClientRect();
        const availableWidth = Math.max(300, (stage?.clientWidth ?? window.innerWidth) - 32);
        const availableHeight = Math.max(320, (stage?.clientHeight ?? (window.innerHeight - (stageRect?.top ?? 140) - 24)) - 28);
        const ratio = pageHeight / PAGE_WIDTH;
        pageAspectRef.current = ratio;
        const widthBudget = availableWidth < 820 ? availableWidth - 12 : (availableWidth - 28) / 2;
        const fittedWidth = Math.max(240, Math.floor(Math.min(widthBudget, availableHeight / ratio)));
        const fittedHeight = Math.max(320, Math.floor(fittedWidth * ratio));

        if (pdf.numPages === 1) {
          host.classList.add("pdf3d-single");
          host.style.width = `${fittedWidth}px`;
          clip.style.width = `${fittedWidth}px`;
          clip.style.height = `${fittedHeight}px`;
          const onlySheet = sheets[0];
          if (onlySheet) onlySheet.style.height = `${fittedHeight}px`;
          host.style.visibility = "visible";
          setPosition({ page: 1, landscape: false });
          setReady(true);
          return;
        }

        const startIndex = normalizePage(initialPageRef.current, pdf.numPages) - 1;
        const portraitMode = window.innerWidth < 760;
        const spreadColumns = portraitMode ? 1 : 2;
        host.style.width = `${fittedWidth * spreadColumns}px`;
        host.style.height = `${fittedHeight}px`;
        clip.style.width = `${fittedWidth * spreadColumns}px`;
        clip.style.height = `${fittedHeight}px`;
        const instance = new PageFlip(host, {
          width: fittedWidth,
          height: fittedHeight,
          size: "stretch",
          minWidth: Math.min(240, fittedWidth),
          maxWidth: fittedWidth,
          minHeight: Math.min(Math.round((240 / fittedWidth) * fittedHeight), fittedHeight),
          maxHeight: fittedHeight,
          startPage: startIndex,
          // Portrait mode clones HTML page elements in StPageFlip. Keep it only
          // on genuinely narrow screens so desktop zoom-out never exposes a
          // cloned "second page" underneath the flipping sheet.
          usePortrait: portraitMode,
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
      renderTask?.cancel();
      if (flipRef.current === engine) flipRef.current = null;
      if (engine && engineLoaded) engine.destroy();
      clip.remove();
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      pageImageUrlsRef.current = {};
      if (loadingTask) void loadingTask.destroy().catch(() => {});
    };
  }, [fileUrl, bookId, contentId, retryCount, fitBookToStage]);

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
      settings.useMouseEvents = !annotationsOpen;
      settings.showPageCorners = false;
      settings.disableFlipByClick = annotationsOpen;
      ui.setHandlers?.();
    }
  }, [annotationsOpen, ready]);

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
  }, [annotations, pendingHighlight, preparedPages, selectedAnnotation?.id]);

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
  const progressPercent = ready && totalPages > 0 ? Math.round((visibleEnd / totalPages) * 100) : 0;
  const preparationPercent = totalPages > 0 ? Math.round((preparedPages / totalPages) * 100) : 0;
  const canGoBack = ready && !busy && position.page > 1;
  const canGoNext = ready && !busy && visibleEnd < totalPages;

  const currentText = useMemo(() => {
    const parts = [pageTextsRef.current[position.page] ?? ""];
    if (visibleEnd > position.page) parts.push(pageTextsRef.current[visibleEnd] ?? "");
    return parts.filter(Boolean).join("\n\n");
  }, [position.page, visibleEnd, preparedPages, textRevision]);

  const ensurePageText = useCallback(async (pageNumber: number) => {
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
        const imageUrl = pageImageUrlsRef.current[pageNumber];
        if (!imageUrl) return nativeText;
        const imageResponse = await fetch(imageUrl);
        const image = await imageResponse.blob();
        const form = new FormData();
        form.set("image", new File([image], `page-${pageNumber}.png`, { type: image.type || "image/png" }));
        if (preferMath) form.set("preferMath", "1");

        const response = await fetch("/api/reader-ocr", { method: "POST", body: form });
        const payload = (await response.json().catch(() => ({}))) as { text?: string; engine?: string; mathText?: string; error?: string };
        if (!response.ok || !payload.text?.trim()) {
          if (nativeText) return nativeText;
          throw new Error(payload.error || `OCR страницы ${pageNumber} не удался.`);
        }

        const ocrText = payload.text.trim();
        const mathText = payload.mathText?.trim() ?? "";
        const baseText = nativeText || ocrText;
        const finalText = mathText && !baseText.includes(mathText)
          ? `${baseText}\n\n[LaTeX OCR]\n${mathText}`
          : baseText;
        if (finalText !== pageTextsRef.current[pageNumber]) {
          pageTextsRef.current[pageNumber] = finalText;
          setTextRevision((value) => value + 1);
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
  }, []);

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
  }, [ensurePageText, position.landscape, position.page, totalPages, visibleEnd]);

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

  const buttonClass = "rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <section ref={sectionRef} data-testid="pdf-reader-shell" data-reader-build={READER_BUILD} className={`reader-shell concept-panel mx-auto w-full min-w-0 max-w-[1680px] space-y-5 rounded-[32px] p-3 text-white sm:p-5 ${fullscreenActive ? "is-fullscreen" : ""}`}>
      <header className="reader-shell-header flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="concept-eyebrow">Reading studio</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
            <Link href={`/books/${slug}`} className="transition hover:text-[var(--accent-text)]">{title}</Link>
          </h1>
          <p className="mt-2 text-xs text-[var(--text-muted)]">Нажмите на название, чтобы вернуться к карточке книги.</p>
        </div>
        <p aria-live="polite" className="text-sm text-[var(--text-secondary)]">
          {ready ? `Страница ${position.page}${visibleEnd > position.page ? `–${visibleEnd}` : ""} из ${totalPages} · ${progressPercent}%` : error ? "Ошибка загрузки" : "Подготовка книги..."}
        </p>
      </header>

      <div role="progressbar" aria-label="Прогресс чтения" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent} className="reader-shell-progress h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[var(--accent-strong)] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
      </div>

      {!ready && !error ? (
        <div className="mx-auto max-w-md space-y-3 py-8 text-center">
          <p className="text-[var(--text-secondary)]">Подготовка чётких страниц...</p>
          <p className="text-sm text-[var(--text-muted)]">{totalPages > 0 ? `${preparedPages} / ${totalPages}` : "Загрузка PDF..."}</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[var(--accent-strong)] transition-all" style={{ width: `${preparationPercent}%` }} /></div>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="space-y-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-5">
          <p className="font-medium text-red-200">Не удалось открыть книгу</p>
          <p className="break-words text-sm text-red-300">{error}</p>
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
        className={`pdf3d-stage ${annotationsOpen ? "is-annotation-mode" : ""}`}
        tabIndex={ready ? 0 : -1}
        aria-label={annotationsOpen ? "Режим Highlight + Note" : "Книга. Используйте стрелки влево и вправо."}
        onKeyDown={(event) => {
          if (annotationsOpen) return;
          if (event.key === "ArrowLeft") { event.preventDefault(); turnPage("previous"); }
          if (event.key === "ArrowRight") { event.preventDefault(); turnPage("next"); }
        }}
      >
        <div className="pdf3d-zoom-layer" style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}>
          <div ref={mountRef} className="pdf3d-mount" />
        </div>
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
        page={position.page}
        getText={prepareAiText}
        onClose={() => setAiOpen(false)}
        onWidthChange={setAiRailWidth}
      />
      </div>

      <div className="reader-shell-nav flex justify-center gap-3">
        <button type="button" className={buttonClass} disabled={!canGoBack} onClick={() => turnPage("previous")}>← Назад</button>
        <button type="button" className={`${buttonClass} bg-[var(--accent-soft)]`} disabled={!canGoNext} onClick={() => turnPage("next")}>Вперёд →</button>
      </div>

      {saveError ? <p role="status" className="reader-shell-status text-center text-sm text-amber-300">Не удалось сохранить прогресс чтения.</p> : null}
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
        onToggleAi={() => setAiOpen((value) => !value)}
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

      <ReaderAnnotationsPanel
        open={Boolean(pendingHighlight || selectedAnnotation)}
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
        .pdf3d-stage { width:100%; min-width:0; height:min(78dvh,calc(100dvh - 155px)); min-height:420px; overflow:auto; border-radius:24px; background:radial-gradient(ellipse at 50% 20%,var(--accent-soft),transparent 66%),#020713; overscroll-behavior:contain; }
        .pdf3d-stage:focus-visible { outline:2px solid var(--accent-strong); outline-offset:4px; }
        .pdf3d-stage.is-annotation-mode { box-shadow: inset 0 0 0 2px var(--accent-border); }
        .pdf3d-zoom-layer { transform-origin:top center; margin-inline:auto; transition:transform 180ms ease; }
        .pdf3d-mount { width:100%; min-height:100%; padding:16px 0; display:flex; align-items:center; justify-content:center; }
        .pdf3d-mount { position:relative; }
        .pdf3d-mount::before { content:""; position:absolute; left:50%; bottom:5%; width:min(72%,980px); height:34px; transform:translateX(-50%); border-radius:50%; background:rgba(0,0,0,.34); filter:blur(22px); pointer-events:none; }
        .pdf3d-book-clip { position:relative; flex:0 0 auto; margin:0 auto; overflow:hidden; isolation:isolate; z-index:1; }
        .pdf3d-book { visibility:hidden; margin:0; position:relative; z-index:1; }
        /* Do not style StPageFlip private wrapper/item nodes. The library uses
           transformed overflow outside the host while composing a spread.
           Clipping those private nodes can make the whole book disappear. */
        .pdf3d-book .stf__outerShadow, .pdf3d-book .stf__innerShadow, .pdf3d-book .stf__hardShadow, .pdf3d-book .stf__hardInnerShadow { display:none !important; opacity:0 !important; }
        .pdf3d-sheet { position:relative; overflow:hidden; background:#fff; box-shadow:inset 0 0 12px rgba(0,0,0,.04); }
        .pdf3d-sheet img { display:block; width:100%; height:100%; object-fit:contain; background:#fff; user-select:none; pointer-events:none; -webkit-user-drag:none; }
        .pdf3d-single { width:min(100%,700px); }
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
        .reader-shell:fullscreen { width:100vw !important; max-width:none !important; height:100dvh; min-height:100dvh; margin:0; padding:14px 16px 16px !important; border:0; border-radius:0 !important; display:grid; grid-template-rows:48px minmax(0,1fr); gap:10px; overflow:hidden; background:#020713; }
        .reader-shell:fullscreen > * { margin-top:0 !important; }
        .reader-shell:fullscreen .reader-shell-header,
        .reader-shell:fullscreen .reader-shell-progress,
        .reader-shell:fullscreen .reader-shell-nav,
        .reader-shell:fullscreen .reader-shell-status { display:none !important; }
        .reader-shell:fullscreen .reader-fullscreen-topbar { display:flex; min-width:0; align-items:center; justify-content:space-between; gap:16px; border-bottom:1px solid rgba(255,255,255,.08); padding:0 6px 8px; color:var(--text-secondary); }
        .reader-fullscreen-title { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-primary); font-family:Georgia,serif; font-size:1.08rem; font-weight:700; }
        .reader-shell:fullscreen .reader-workspace { height:100%; min-height:0; border-radius:22px; }
        .reader-shell:fullscreen .pdf3d-stage { height:100%; min-height:0; border-radius:20px; overflow:auto; }
        .reader-shell:fullscreen .pdf3d-zoom-layer { min-height:100%; display:flex; align-items:center; justify-content:center; }
        .reader-shell:fullscreen .pdf3d-mount { height:100%; min-height:0; padding:10px 14px; }
        @media(max-width:640px){.pdf3d-mount{padding:12px 0 20px;}}
      `}</style>
    </section>
  );
}
