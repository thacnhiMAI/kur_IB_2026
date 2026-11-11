"use client";

import {
  ChevronLeft,
  ChevronRight,
  Grip,
  Highlighter,
  Maximize,
  Minus,
  NotebookText,
  Play,
  Plus,
  Search,
  Sparkles,
  Square
} from "lucide-react";
import { createPortal } from "react-dom";
import {
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";

import {
  APP_SETTINGS_EVENT,
  APP_SETTINGS_STORAGE_KEY,
  persistAppSettings,
  readAppSettingsFromBrowser
} from "@/lib/preferences/settings";

type ReaderFloatingToolbarProps = {
  currentPage: number;
  totalPages: number;
  zoom: number;
  canPrevious: boolean;
  canNext: boolean;
  speaking: boolean;
  aiOpen: boolean;
  aiEnabled: boolean;
  annotationsOpen: boolean;
  notesListOpen: boolean;
  searchOpen: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onGoToPage: (page: number) => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onResetZoom: () => void;
  onToggleSpeech: () => void;
  onToggleAi: () => void;
  onToggleAnnotations: () => void;
  onToggleNotes: () => void;
  onToggleSearch: () => void;
  onFullscreen: () => void;
};

type Position = { x: number; y: number };

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  width: number;
  height: number;
  nextX: number;
  nextY: number;
};

const POSITION_KEY = "smart-library:reader-toolbar-position:v6";
const DEFAULT_TOOLBAR_WIDTH = 360;
const EDGE_GAP = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readSavedPosition(): Position | null {
  if (typeof window === "undefined") return null;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(POSITION_KEY) ?? "null") as Position | null;
    if (!parsed || !Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function ReaderFloatingToolbar(props: ReaderFloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const positionRef = useRef<Position>({ x: 24, y: 104 });
  const dragState = useRef<DragState | null>(null);
  const frameRef = useRef<number | null>(null);

  const [expanded, setExpanded] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pageInput, setPageInput] = useState("1");

  function applyTransform(position: Position) {
    const node = toolbarRef.current;
    if (!node) return;
    // Use one viewport coordinate system for both the pointer and the toolbar.
    // The previous transform-based implementation could accumulate an offset
    // after resize/layout changes and make the toolbar jump away from the cursor.
    node.style.left = `${Math.round(position.x)}px`;
    node.style.top = `${Math.round(position.y)}px`;
    node.style.transform = "none";
  }

  function clampPosition(position: Position, width?: number, height?: number): Position {
    const toolbar = toolbarRef.current;
    const measuredWidth = width ?? toolbar?.offsetWidth ?? 92;
    const measuredHeight = height ?? toolbar?.offsetHeight ?? 60;

    return {
      x: clamp(
        position.x,
        EDGE_GAP,
        Math.max(EDGE_GAP, window.innerWidth - measuredWidth - EDGE_GAP)
      ),
      y: clamp(
        position.y,
        EDGE_GAP,
        Math.max(EDGE_GAP, window.innerHeight - measuredHeight - EDGE_GAP)
      )
    };
  }

  useLayoutEffect(() => {
    const settings = readAppSettingsFromBrowser();
    setExpanded(settings.readerToolbarExpanded);

    const saved = readSavedPosition();
    const initial = saved ?? {
      x: Math.max(EDGE_GAP, window.innerWidth - Math.min(DEFAULT_TOOLBAR_WIDTH, window.innerWidth - 24) - 24),
      y: Math.min(120, Math.max(72, window.innerHeight * 0.1))
    };

    const next = clampPosition(initial);
    positionRef.current = next;
    applyTransform(next);
    // Mount only after left/top are synchronized. This removes the one-frame
    // left:0/top:0 paint that caused the very first drag to jump.
    setPortalTarget(document.fullscreenElement instanceof HTMLElement ? document.fullscreenElement : document.body);
    setMounted(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!mounted || !portalTarget) return;
    const next = clampPosition(positionRef.current);
    positionRef.current = next;
    applyTransform(next);
  // Apply left/top in the same pre-paint phase whenever the portal moves between
  // document.body and the fullscreen top-layer element.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, portalTarget]);


  useEffect(() => {
    function syncPortalTarget() {
      const nextTarget = document.fullscreenElement instanceof HTMLElement
        ? document.fullscreenElement
        : document.body;
      setPortalTarget(nextTarget);
      requestAnimationFrame(() => {
        const next = clampPosition(positionRef.current);
        positionRef.current = next;
        applyTransform(next);
      });
    }

    document.addEventListener("fullscreenchange", syncPortalTarget);
    return () => document.removeEventListener("fullscreenchange", syncPortalTarget);
  }, []);

  useEffect(() => {
    setPageInput(String(Math.max(1, props.currentPage)));
  }, [props.currentPage]);

  useEffect(() => {
    function onResize() {
      if (dragState.current) return;
      const next = clampPosition(positionRef.current);
      positionRef.current = next;
      applyTransform(next);
    }

    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    function syncSettings() {
      setExpanded(readAppSettingsFromBrowser().readerToolbarExpanded);
    }

    function onStorage(event: StorageEvent) {
      if (event.key === APP_SETTINGS_STORAGE_KEY) syncSettings();
    }

    window.addEventListener(APP_SETTINGS_EVENT, syncSettings);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(APP_SETTINGS_EVENT, syncSettings);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  function persistPosition(next: Position) {
    try {
      window.localStorage.setItem(POSITION_KEY, JSON.stringify(next));
    } catch {
      // Reader still works when storage is unavailable.
    }
  }

  function toggleExpanded() {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    const settings = readAppSettingsFromBrowser();
    persistAppSettings({ ...settings, readerToolbarExpanded: nextExpanded });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const next = clampPosition(positionRef.current);
        positionRef.current = next;
        applyTransform(next);
      });
    });
  }

  function beginDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const toolbar = toolbarRef.current;
    if (!toolbar || event.button !== 0) return;

    const rect = toolbar.getBoundingClientRect();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    // The toolbar is portaled to document.body, so fixed left/top and clientX/Y
    // always share the viewport coordinate system. Do not rewrite its position
    // on pointer-down: that synchronous correction was the last source of the
    // visible first-click jump. Movement starts from the already-painted ref.
    const startPosition = positionRef.current;
    dragState.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: startPosition.x,
      startY: startPosition.y,
      width: rect.width,
      height: rect.height,
      nextX: startPosition.x,
      nextY: startPosition.y
    };

    setDragging(true);
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const state = dragState.current;
    if (!state || state.pointerId !== event.pointerId) return;

    event.preventDefault();

    const deltaX = event.clientX - state.startClientX;
    const deltaY = event.clientY - state.startClientY;

    state.nextX = clamp(
      state.startX + deltaX,
      EDGE_GAP,
      Math.max(EDGE_GAP, window.innerWidth - state.width - EDGE_GAP)
    );
    state.nextY = clamp(
      state.startY + deltaY,
      EDGE_GAP,
      Math.max(EDGE_GAP, window.innerHeight - state.height - EDGE_GAP)
    );

    if (frameRef.current !== null) return;

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const current = dragState.current;
      if (!current) return;

      const next = { x: current.nextX, y: current.nextY };
      positionRef.current = next;
      applyTransform(next);
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const state = dragState.current;
    if (!state || state.pointerId !== event.pointerId) return;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const next = clampPosition(
      { x: state.nextX, y: state.nextY },
      state.width,
      state.height
    );

    dragState.current = null;
    positionRef.current = next;
    applyTransform(next);
    persistPosition(next);
    setDragging(false);

    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore browsers that release pointer capture automatically.
    }
  }

  function submitPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requested = Number(pageInput);
    if (!Number.isInteger(requested) || requested < 1 || requested > props.totalPages) {
      setPageInput(String(Math.max(1, props.currentPage)));
      return;
    }

    props.onGoToPage(requested);
  }

  function normalizePageInput() {
    const requested = Number(pageInput);
    if (!Number.isInteger(requested) || requested < 1 || requested > props.totalPages) {
      setPageInput(String(Math.max(1, props.currentPage)));
    }
  }

  if (!mounted || !portalTarget) return null;

  const totalPages = Math.max(1, props.totalPages);
  const pageDigits = String(totalPages).length;
  const compactIconButton = "reader-tool-button reader-tool-button--square";

  return createPortal(
    <div
      ref={toolbarRef}
      data-testid="reader-floating-toolbar"
      data-dragging={dragging ? "true" : "false"}
      data-expanded={expanded ? "true" : "false"}
      className="reader-floating-toolbar fixed left-0 top-0 z-[80] select-none"
      style={{
        maxWidth: "calc(100vw - 24px)",
        willChange: dragging ? "left, top" : undefined,
        contain: "layout paint style"
      }}
    >
      <div className="reader-toolbar-topline">
        <button
          type="button"
          aria-label="Перетащить панель"
          title="Перетащить панель"
          className={`${compactIconButton} reader-drag-handle cursor-grab active:cursor-grabbing`}
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <Grip size={21} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={toggleExpanded}
          className={compactIconButton}
          aria-expanded={expanded}
          aria-label={expanded ? "Свернуть панель" : "Развернуть панель"}
          title={expanded ? "Свернуть" : "Развернуть"}
        >
          {expanded ? <Minus size={22} strokeWidth={2.4} /> : <Plus size={22} strokeWidth={2.4} />}
        </button>

        {!expanded ? (
          <div className="reader-toolbar-collapsed-status">
            <span className="tabular-nums">{Math.max(1, props.currentPage)} / {totalPages}</span>
            <button
              type="button"
              className={`reader-tool-button reader-tool-button--compact ${props.annotationsOpen ? "reader-tool-button--active" : ""}`}
              onClick={props.onToggleAnnotations}
              title="Highlight + Note"
              aria-label="Highlight + Note"
            >
              <Highlighter size={17} strokeWidth={2.2} />
            </button>
            <button type="button" className={`reader-tool-button reader-tool-button--compact ${props.notesListOpen ? "reader-tool-button--active" : ""}`} onClick={props.onToggleNotes} title="Заметки" aria-label="Заметки">
              <NotebookText size={16} strokeWidth={2.1} />
            </button>
            <button type="button" className={`reader-tool-button reader-tool-button--compact ${props.searchOpen ? "reader-tool-button--active" : ""}`} onClick={props.onToggleSearch} title="Поиск в PDF" aria-label="Поиск в PDF">
              <Search size={16} strokeWidth={2.1} />
            </button>
          </div>
        ) : null}
      </div>

      {expanded ? (
        <div className="reader-toolbar-expanded">
          <form onSubmit={submitPage} className="reader-toolbar-mainrow">
            <button
              type="button"
              className={compactIconButton}
              disabled={!props.canPrevious}
              onClick={props.onPrevious}
              title="Предыдущая страница"
              aria-label="Предыдущая страница"
            >
              <ChevronLeft size={25} strokeWidth={2.2} />
            </button>

            <div className="reader-page-counter" aria-label={`Страница ${props.currentPage} из ${totalPages}`}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pageInput}
                onChange={(event) => {
                  const next = event.target.value.replace(/\D+/g, "");
                  setPageInput(next.slice(0, pageDigits));
                }}
                onFocus={(event) => event.currentTarget.select()}
                onBlur={normalizePageInput}
                className="reader-page-input"
                style={{ "--reader-page-digits": pageDigits } as CSSProperties}
                aria-label="Номер страницы"
                title="Введите номер страницы и нажмите Enter"
              />
              <span className="reader-page-total tabular-nums">/ {totalPages}</span>
            </div>

            <button
              type="button"
              className={compactIconButton}
              disabled={!props.canNext}
              onClick={props.onNext}
              title="Следующая страница"
              aria-label="Следующая страница"
            >
              <ChevronRight size={25} strokeWidth={2.2} />
            </button>

            <span className="reader-toolbar-vdivider" aria-hidden="true" />

            <button
              type="button"
              className={compactIconButton}
              onClick={props.onZoomOut}
              title="Уменьшить"
              aria-label="Уменьшить"
            >
              <Minus size={22} strokeWidth={2.4} />
            </button>

            <button
              type="button"
              className="reader-tool-button reader-zoom-value tabular-nums"
              onClick={props.onResetZoom}
              title="Сбросить масштаб"
            >
              {Math.round(props.zoom * 100)}%
            </button>

            <button
              type="button"
              className={compactIconButton}
              onClick={props.onZoomIn}
              title="Увеличить"
              aria-label="Увеличить"
            >
              <Plus size={22} strokeWidth={2.4} />
            </button>
          </form>

          <div className="reader-toolbar-actions">
            <button
              type="button"
              className={`${compactIconButton} reader-mobile-collapse`}
              onClick={toggleExpanded}
              aria-expanded={expanded}
              aria-label="Свернуть панель"
            >
              <Minus size={21} strokeWidth={2.4} />
            </button>
            <button
              type="button"
              className={compactIconButton}
              onClick={props.onToggleSpeech}
              title={props.speaking ? "Остановить чтение вслух" : "Читать текущую страницу вслух"}
              aria-label={props.speaking ? "Остановить чтение вслух" : "Читать текущую страницу вслух"}
            >
              {props.speaking ? <Square size={17} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>

            <button
              type="button"
              className={`${compactIconButton} ${props.aiOpen ? "reader-tool-button--active" : ""}`}
              onClick={props.onToggleAi}
              disabled={!props.aiEnabled}
              title={props.aiEnabled ? "AI-помощник" : "AI отключён в Настройках"}
              aria-label="AI-помощник"
              aria-pressed={props.aiOpen}
            >
              <Sparkles size={19} fill="currentColor" />
            </button>

            <button
              type="button"
              className={`${compactIconButton} ${props.annotationsOpen ? "reader-tool-button--active" : ""}`}
              onClick={props.onToggleAnnotations}
              title="Выделения и заметки"
              aria-label="Выделения и заметки"
            >
              <Highlighter size={19} strokeWidth={2.1} />
            </button>

            <button
              type="button"
              className={`${compactIconButton} ${props.notesListOpen ? "reader-tool-button--active" : ""}`}
              onClick={props.onToggleNotes}
              title="Список заметок"
              aria-label="Список заметок"
            >
              <NotebookText size={18} strokeWidth={2.1} />
            </button>

            <button
              type="button"
              className={`${compactIconButton} ${props.searchOpen ? "reader-tool-button--active" : ""}`}
              onClick={props.onToggleSearch}
              title="Поиск в PDF"
              aria-label="Поиск в PDF"
            >
              <Search size={18} strokeWidth={2.1} />
            </button>

            <button
              type="button"
              className={compactIconButton}
              onClick={props.onFullscreen}
              title="Полный экран"
              aria-label="Полный экран"
            >
              <Maximize size={22} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      ) : null}
    </div>,
    portalTarget
  );
}
