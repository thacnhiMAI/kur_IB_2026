"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { DEFAULT_AR_COVER, type ARBookPayload } from "@/lib/ar/types";
import { resolveBookImageSrc } from "@/lib/books/image-source";

export function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ARBookPayload | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!active || !video) return;
    let cancelled = false;
    let stream: MediaStream | undefined;
    let frame = 0;
    let lastScan = 0;
    const request = new AbortController();
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    function stop() {
      cancelled = true;
      request.abort();
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    }

    async function start() {
      if (!video || !context || !navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable");
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      const { default: decode } = await import("jsqr");
      if (cancelled) return;
      const scan = (time: number) => {
        if (time - lastScan >= 160 && video.videoWidth) {
          lastScan = time;
          canvas.width = Math.min(640, video.videoWidth);
          canvas.height = Math.round(canvas.width * video.videoHeight / video.videoWidth);
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
          const qr = decode(pixels.data, pixels.width, pixels.height);
          if (qr) {
            const url = URL.canParse(qr.data) ? new URL(qr.data) : null;
            const match = url?.origin === location.origin ? /^\/ar\/books\/([a-z0-9-]+)\/?$/i.exec(url.pathname) : null;
            if (match) {
              setError("");
              void fetch(`/api/ar/books/${match[1]}`, { signal: request.signal }).then(async (response) => {
                if (!response.ok) throw new Error("Book unavailable");
                const book: ARBookPayload = await response.json();
                if (!cancelled) setPreview(book);
              }).catch(() => {
                if (!cancelled) {
                  stop();
                  setActive(false);
                  setError("Книга недоступна. Проверьте QR-код или подключение к сети.");
                }
              });
              return;
            }
            setError("Нужен QR-код книги с этого сайта.");
          }
        }
        frame = requestAnimationFrame(scan);
      };
      frame = requestAnimationFrame(scan);
    }

    void start().catch(() => {
      if (cancelled) return;
      stop();
      setActive(false);
      setError("Камера недоступна. Проверьте разрешение и откройте сайт по HTTPS.");
    });
    return stop;
  }, [active]);

  return (
    <section className="space-y-3">
      <button type="button" className="concept-button-secondary rounded-xl px-4 py-2" onClick={() => {
        setError("");
        setPreview(null);
        setActive(!active);
      }}>
        {active ? "Закрыть камеру" : "Сканировать QR книги"}
      </button>
      {active && (
        <div className="relative max-w-xl overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} muted playsInline aria-label="Камера для QR-кода" className="min-h-52 w-full object-cover" />
          {preview && (
            <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/25 p-4 sm:gap-6" aria-live="polite">
              <div className="shrink-0 [perspective:440px]">
                <div className="overflow-hidden rounded-sm border-r-8 border-[#ece2c7] shadow-2xl [transform:rotateY(-28deg)_rotateX(5deg)]">
                  <Image src={resolveBookImageSrc(preview.coverImage, DEFAULT_AR_COVER)} width={116} height={164} alt={preview.title} className="aspect-[5/7] w-20 object-cover sm:w-28" />
                </div>
              </div>
              <div className="min-w-0 max-w-xs space-y-2 rounded-xl bg-slate-950/90 p-3 text-white sm:p-4">
                <h2 className="line-clamp-2 font-semibold">{preview.title}</h2>
                <p className="line-clamp-3 text-xs sm:text-sm">{preview.description}</p>
                <Link href={`/ar/books/${encodeURIComponent(preview.slug)}`} onClick={() => setActive(false)} className="inline-block text-sm font-semibold text-cyan-200 underline">
                  Открыть в WebXR
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
      {error && <p role="status">{error}</p>}
    </section>
  );
}
