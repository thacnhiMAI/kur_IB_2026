"use client";

import { Grip, Plus, Save, X } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { customHighlightColor, highlightPresets } from "@/lib/reading/highlight-color";

export type HighlightRect = { x: number; y: number; width: number; height: number };
export type ReaderAnnotation = {
  id: string;
  page: number;
  quote: string | null;
  note: string | null;
  rects: unknown;
  color: string;
  createdAt?: string;
};

type Position = { x: number; y: number };
type DragState = { pointerId: number; startX: number; startY: number; originX: number; originY: number };

const POSITION_KEY = "smart-library:reader-note-editor-position:v1";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ReaderAnnotationsPanel({
  open,
  bookId,
  contentId,
  page,
  pendingHighlight,
  selectedAnnotation,
  onSaved,
  onClose
}: {
  open: boolean;
  bookId: string;
  contentId: string | null;
  page: number;
  pendingHighlight: { page: number; rect: HighlightRect } | null;
  selectedAnnotation: ReaderAnnotation | null;
  onSaved: (annotation: ReaderAnnotation) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const positionRef = useRef<Position>({ x: 26, y: 120 });
  const dragRef = useRef<DragState | null>(null);
  const frameRef = useRef<number | null>(null);
  const [note, setNote] = useState("");
  const [color, setColor] = useState("yellow");
  const customColor = customHighlightColor(color);
  const [saving, setSaving] = useState(false);

  const editing = Boolean(selectedAnnotation && !pendingHighlight);
  const activeRect = pendingHighlight?.page === page ? pendingHighlight.rect : null;

  function applyPosition(position: Position) {
    const node = panelRef.current;
    if (!node) return;
    node.style.left = `${Math.round(position.x)}px`;
    node.style.top = `${Math.round(position.y)}px`;
    node.style.right = "auto";
    node.style.bottom = "auto";
    node.style.transform = "none";
  }

  function clampPosition(position: Position) {
    const node = panelRef.current;
    const width = node?.offsetWidth ?? 310;
    const height = node?.offsetHeight ?? 190;
    return {
      x: clamp(position.x, 10, Math.max(10, window.innerWidth - width - 10)),
      y: clamp(position.y, 10, Math.max(10, window.innerHeight - height - 10))
    };
  }

  useLayoutEffect(() => {
    if (!open) return;
    let saved: Position | null = null;
    try {
      const parsed = JSON.parse(window.localStorage.getItem(POSITION_KEY) ?? "null") as Position | null;
      if (parsed && Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) saved = parsed;
    } catch { /* ignore */ }
    const next = clampPosition(saved ?? { x: 26, y: Math.max(76, window.innerHeight - 280) });
    positionRef.current = next;
    applyPosition(next);
  }, [open]);

  useEffect(() => {
    if (editing && selectedAnnotation) {
      setNote(selectedAnnotation.note ?? "");
      setColor(selectedAnnotation.color);
    } else {
      setNote("");
      setColor("yellow");
    }
  }, [editing, selectedAnnotation, pendingHighlight?.page, pendingHighlight?.rect]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  function beginDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const origin = positionRef.current;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: origin.x, originY: origin.y };
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    event.preventDefault();
    const next = clampPosition({
      x: state.originX + event.clientX - state.startX,
      y: state.originY + event.clientY - state.startY
    });
    positionRef.current = next;
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      applyPosition(positionRef.current);
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const next = clampPosition(positionRef.current);
    positionRef.current = next;
    applyPosition(next);
    try { window.localStorage.setItem(POSITION_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    try { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
  }

  async function save() {
    if (!activeRect && !selectedAnnotation) return;
    setSaving(true);
    try {
      const response = await fetch("/api/reader-annotations", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing && selectedAnnotation
          ? { id: selectedAnnotation.id, note: note.trim() || null, color }
          : { bookId, contentId, page, note: note.trim() || null, rects: activeRect ? [activeRect] : undefined, color })
      });
      const result = await response.json();
      if (!response.ok || !result.ok || !result.annotation) throw new Error(result.message ?? "Не удалось сохранить заметку.");
      onSaved(result.annotation);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <aside ref={panelRef} className="reader-note-editor" aria-label="Редактор заметки">
      <div className="reader-note-editor-head">
        <button
          type="button"
          className="reader-note-editor-drag"
          aria-label="Перетащить редактор заметки"
          title="Перетащить"
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        ><Grip size={16} /></button>
        <div className="reader-note-editor-colors">
          {highlightPresets.map((value) => (
            <button key={value} type="button" onClick={() => setColor(value)} aria-label={`Цвет ${value}`} aria-pressed={color === value} className={`reader-annotation-color is-${value} ${color === value ? "is-active" : ""}`} />
          ))}
          <label className={`reader-annotation-color reader-annotation-color-custom ${customColor ? "is-active" : ""}`}
            style={customColor ? { backgroundColor: `${customColor}45` } : undefined}>
            <Plus size={16} aria-hidden="true" />
            <input type="color" aria-label="Выбрать свой цвет" value={customColor ?? "#facc15"} onChange={(event) => setColor(event.currentTarget.value)} />
          </label>
        </div>
        <button type="button" className="reader-note-editor-close" onClick={onClose} aria-label="Закрыть"><X size={16} /></button>
      </div>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        maxLength={5000}
        className="reader-note-editor-input"
        placeholder="Заметка…"
        autoFocus
      />
      <button type="button" disabled={saving} onClick={() => void save()} className="reader-note-editor-save">
        <Save size={15} /> Сохранить
      </button>
    </aside>
  );
}
