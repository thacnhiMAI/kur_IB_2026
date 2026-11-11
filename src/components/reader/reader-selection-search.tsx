"use client";

import { ArrowLeftRight, Grip, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { translationLanguages, translationTextLimit } from "@/lib/reading/translation";

type Point = { x: number; y: number };

export function ReaderSelectionSearch({ anchor, getImage, getText, onClose }: {
  anchor: Point;
  getImage: () => Promise<File>;
  getText: () => Promise<string>;
  onClose: () => void;
}) {
  const box = useRef<HTMLElement>(null);
  const lensFileInput = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [position, setPosition] = useState(anchor);
  const [query, setQuery] = useState("");
  const [image, setImage] = useState<{ url: string; file: File } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lensError, setLensError] = useState("");
  const [translationOpen, setTranslationOpen] = useState(false);
  const [languages, setLanguages] = useState({ source: "en", target: "ru" });
  const [translation, setTranslation] = useState<{ input: string; value?: string; error?: string } | null>(null);
  const [translating, setTranslating] = useState(false);
  const translationRequest = useRef<AbortController | null>(null);
  const text = query.trim();
  const translationInput = JSON.stringify({ ...languages, text });
  const result = translation?.input === translationInput ? translation : null;

  useEffect(() => () => translationRequest.current?.abort(), []);

  async function translate() {
    if (!text || translationRequest.current) return;
    const controller = new AbortController();
    translationRequest.current = controller;
    setTranslation(null);
    setTranslating(true);
    const fallback = "Перевод временно недоступен. Попробуйте ещё раз.";
    try {
      const response = await fetch("/api/reader-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: translationInput,
        signal: controller.signal
      });
      const payload = await response.json() as { translation?: string; error?: string };
      if (!response.ok || !payload.translation) throw new Error(payload.error ?? fallback);
      setTranslation({ input: translationInput, value: payload.translation });
    } catch (error) {
      if (!controller.signal.aborted) {
        setTranslation({ input: translationInput, error: error instanceof Error ? error.message : fallback });
      }
    } finally {
      translationRequest.current = null;
      if (!controller.signal.aborted) setTranslating(false);
    }
  }

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
        setImage({ url, file });
        if (nativeText) {
          setQuery((current) => current || nativeText.slice(0, translationTextLimit));
          return;
        }
        const form = new FormData();
        form.set("image", file);
        const response = await fetch("/api/reader-ocr", { method: "POST", body: form, signal: controller.signal });
        const result = await response.json() as { text?: string };
        if (controller.signal.aborted) return;
        const text = (result.text ?? "").trim();
        if (response.ok && /[\p{L}\p{N}]{2}/u.test(text) && !/�|\[(?:неразборчиво|illegible|unreadable)\]/iu.test(text)) {
          setQuery((current) => current || text.slice(0, translationTextLimit));
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
    <section ref={box} className="reader-selection-search" role="dialog" aria-label="Поиск и перевод" style={{ left: position.x, top: position.y }}
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
          <Grip size={18} /> Поиск
        </div>
        <button type="button" className="reader-selection-translation-toggle" aria-expanded={translationOpen} onClick={() => setTranslationOpen(!translationOpen)}>Перевод</button>
        <button type="button" aria-label="Закрыть окно" onClick={onClose}><X size={18} /></button>
      </header>
      <div className="reader-selection-search-body">
        {image ? <Image src={image.url} alt="Выделенная область PDF" width={300} height={120} unoptimized /> : null}
        <textarea aria-label={translationOpen ? "Текст для перевода" : "Поисковый запрос"} rows={3} maxLength={translationTextLimit} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={translationOpen ? "Введите или исправьте текст для перевода…" : "Введите или исправьте текст для поиска…"} />
        <p role="status">{loading ? "Распознаём выделенный фрагмент…" : translationOpen ? "Проверьте текст и выберите языки перевода." : error || "Проверьте распознанный текст перед поиском."}</p>
        {translationOpen ? (
          <>
            <div className="reader-selection-translation-languages">
              <label>С языка
                <select value={languages.source} onChange={(event) => {
                  const source = event.currentTarget.value;
                  setLanguages((current) => ({ source, target: source === current.target ? current.source : current.target }));
                }}>
                  {Object.entries(translationLanguages).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>
              <button type="button" aria-label="Поменять языки местами" onClick={() => setLanguages(({ source, target }) => ({ source: target, target: source }))}><ArrowLeftRight size={18} /></button>
              <label>На язык
                <select value={languages.target} onChange={(event) => {
                  const target = event.currentTarget.value;
                  setLanguages((current) => ({ source: target === current.source ? current.target : current.source, target }));
                }}>
                  {Object.entries(translationLanguages).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>
            </div>
            <button type="button" className="reader-selection-translate-button" disabled={!text || translating} onClick={() => void translate()}>
              {translating ? "Переводим…" : "Перевести"}
            </button>
            {result?.value ? <label className="reader-selection-translation-result">Результат перевода
              <textarea readOnly rows={4} value={result.value} />
            </label> : null}
            {result?.error ? <p role="alert">{result.error}</p> : null}
          </>
        ) : null}
        {!translationOpen && text ? <a href={`https://www.google.com/search?q=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">Поиск в Google</a> : null}
        {!translationOpen && image ? (
          <form action="https://lens.google.com/v3/upload" method="post" encType="multipart/form-data" target="_blank" rel="noopener noreferrer"
            onSubmit={(event) => {
              const input = lensFileInput.current;
              try {
                if (!input) throw new Error("Missing Lens file input");
                const transfer = new DataTransfer();
                transfer.items.add(image.file);
                input.files = transfer.files;
                if (!input.files?.length) throw new Error("Missing Lens upload file");
                setLensError("");
              } catch {
                event.preventDefault();
                setLensError("Браузер не смог отправить изображение в Google Lens.");
              }
            }}>
            <input ref={lensFileInput} type="file" name="encoded_image" hidden />
            {text ? <input type="hidden" name="q" value={text} /> : null}
            <button type="submit" className="reader-selection-search-lens">Google Lens</button>
            {lensError ? <p role="alert">{lensError}</p> : null}
          </form>
        ) : null}
      </div>
    </section>
  );
}
