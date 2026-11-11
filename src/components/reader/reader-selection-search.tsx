"use client";

import { Grip, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

export function ReaderSelectionSearch({ anchor, getImage, getText, onClose }: {
  anchor: Point;
  getImage: () => Promise<File>;
  getText: () => Promise<string>;
  onClose: () => void;
}) {
  const box = useRef<HTMLElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [position, setPosition] = useState(anchor);
  const [query, setQuery] = useState("");
  const [image, setImage] = useState<{ url: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function clamp({ x, y }: Point) {
    const { clientWidth, clientHeight } = document.documentElement;
    return {
      x: Math.max(8, Math.min(x, clientWidth - (box.current?.offsetWidth ?? 320) - 8)),
      y: Math.max(8, Math.min(y, clientHeight - (box.current?.offsetHeight ?? 280) - 8))
    };
  }

  useLayoutEffect(() => {
    const node = box.current;
    if (!node) return;
    const fit = () => setPosition((current) => {
      const next = clamp(current);
      return next.x === current.x && next.y === current.y ? current : next;
    });
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    window.addEventListener("resize", fit);
    return () => { observer.disconnect(); window.removeEventListener("resize", fit); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    void (async () => {
      try {
        const [file, nativeText] = await Promise.all([getImage(), getText().catch(() => "")]);
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(file);
        setImage({ url, name: file.name });
        if (nativeText) {
          setQuery((current) => current || nativeText.slice(0, 800));
          return;
        }
        const form = new FormData();
        form.set("image", file);
        const response = await fetch("/api/reader-ocr", { method: "POST", body: form, signal: controller.signal });
        const result = await response.json() as { text?: string };
        if (controller.signal.aborted) return;
        const text = (result.text ?? "").trim();
        if (response.ok && /[\p{L}\p{N}]{2}/u.test(text) && !/�|\[(?:неразборчиво|illegible|unreadable)\]/iu.test(text)) {
          setQuery((current) => current || text.slice(0, 800));
        } else {
          setError("Текст не распознан уверенно. Используйте Google Lens или введите запрос.");
        }
      } catch {
        if (!controller.signal.aborted) setError(url ? "OCR недоступен. Используйте Google Lens или введите запрос." : "Не удалось получить изображение выделения.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [getImage, getText]);

  return (
    <section ref={box} className="reader-selection-search" role="dialog" aria-label="Search" style={{ left: position.x, top: position.y }}
      onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
      <header>
        <div className="reader-selection-search-grip" onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { id: event.pointerId, x: event.clientX - position.x, y: event.clientY - position.y };
        }} onPointerMove={(event) => {
          const start = drag.current;
          if (start?.id === event.pointerId) setPosition(clamp({ x: event.clientX - start.x, y: event.clientY - start.y }));
        }} onLostPointerCapture={() => { drag.current = null; }}>
          <Grip size={18} /> Search
        </div>
        <button type="button" aria-label="Закрыть поиск" onClick={onClose}><X size={18} /></button>
      </header>
      <div className="reader-selection-search-body">
        {image ? <Image src={image.url} alt="Выделенная область PDF" width={300} height={120} unoptimized /> : null}
        <textarea aria-label="Поисковый запрос" rows={3} maxLength={800} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Введите или исправьте текст для поиска…" />
        <p role="status">{loading ? "Распознаём выделенный фрагмент…" : error || "Проверьте распознанный текст перед поиском."}</p>
        {query.trim() ? <a href={`https://www.google.com/search?q=${encodeURIComponent(query.trim())}`} target="_blank" rel="noopener noreferrer">Google Search</a> : null}
        {image ? <div className="reader-selection-search-lens">
          <a href="https://lens.google.com/" target="_blank" rel="noopener noreferrer">Google Lens</a>
          <a href={image.url} download={image.name}>Скачать фрагмент для Lens</a>
        </div> : null}
      </div>
    </section>
  );
}
