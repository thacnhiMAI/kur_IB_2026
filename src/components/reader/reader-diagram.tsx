"use client";

import { useEffect, useId, useState } from "react";

let renderer: Promise<typeof import("mermaid").default> | undefined;

function getRenderer() {
  renderer ??= import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", htmlLabels: false, maxTextSize: 6000 });
    return mermaid;
  });
  return renderer;
}

export function ReaderDiagram({ source }: { source: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [drawing, setDrawing] = useState<{ source: string; html: string; ratio: number }>();
  const [failedSource, setFailedSource] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    if (source.length > 6000 || /%%\{|^---|<|\bclick\b/im.test(source)) {
      setFailedSource(source);
      return;
    }
    void getRenderer().then((mermaid) => cancelled ? undefined : mermaid.render("readerDiagram" + id, source))
      .then((result) => {
        if (cancelled || !result) return;
        const svg = new DOMParser().parseFromString(result.svg, "image/svg+xml").documentElement;
        const size = svg.getAttribute("viewBox")?.trim().split(/\s+/).map(Number);
        const ratio = size?.[2] && size?.[3] ? size[3] / size[2] : 0.7;
        setDrawing({
          source, ratio,
          html: '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'"><style>body{margin:0;background:white}svg{width:100%;height:auto}</style>' + result.svg
        });
      }).catch(() => { if (!cancelled) setFailedSource(source); });
    return () => { cancelled = true; };
  }, [id, source]);

  if (failedSource === source) return <pre>{source}</pre>;
  if (drawing?.source !== source) return <p role="status">Загрузка диаграммы…</p>;
  return <iframe sandbox="" title="Диаграмма" className="reader-ai-diagram" srcDoc={drawing.html}
    style={{ height: Math.min(460, Math.max(95, drawing.ratio * 360)) }} />;
}
