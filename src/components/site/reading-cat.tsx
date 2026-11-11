"use client";

import { useEffect, useRef, useState } from "react";

export function ReadingCat() {
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function turnPage() {
    if (timer.current) clearTimeout(timer.current);
    setPlaying(true);
    timer.current = setTimeout(() => setPlaying(false), 1600);
  }
  return (
    <button type="button" className="reading-cat" data-playing={playing} onClick={turnPage}
      aria-label="Кот читает книгу — нажмите, чтобы перевернуть страницу" title="Поможем котику читать?">
      <svg viewBox="0 0 156 94" role="img" aria-label="Котёнок с открытой книгой">
        <ellipse cx="78" cy="85" rx="53" ry="5" fill="var(--accent-soft)" />
        <path className="cat-tail" d="M115 75 C151 83 153 52 141 51 C133 50 134 61 141 62" fill="none" stroke="#e5a86d" strokeWidth="9" strokeLinecap="round" />
        <ellipse cx="78" cy="66" rx="33" ry="22" fill="#f3bf8b" />
        <g className="cat-head">
          <path d="M49 28 L48 8 L66 19 Q78 13 91 20 L108 8 L105 36 Q108 58 78 61 Q44 59 49 28" fill="#f7ca9c" stroke="#d99d68" strokeWidth="1.5" />
          <path d="M53 15 L54 29 L63 23 M101 15 L99 29 L92 23" fill="#eaa7aa" />
          <path d="M69 20 L72 29 M77 17 L78 27 M86 20 L84 29" stroke="#d99d68" strokeWidth="3" strokeLinecap="round" />
          <g className="cat-eyes" fill="#394052"><ellipse cx="64" cy="36" rx="3.2" ry="4" /><ellipse cx="92" cy="36" rx="3.2" ry="4" /></g>
          <ellipse cx="59" cy="44" rx="6" ry="3" fill="#eea3a4" opacity=".65" /><ellipse cx="97" cy="44" rx="6" ry="3" fill="#eea3a4" opacity=".65" />
          <path d="M75 42 L81 42 L78 46 Z" fill="#b77778" /><path d="M78 46 Q74 51 70 47 M78 46 Q82 51 86 47" fill="none" stroke="#8f6452" strokeWidth="1.5" />
        </g>
        <path d="M39 59 Q57 54 77 64 Q97 54 117 59 L115 84 Q95 78 77 86 Q58 78 41 84 Z" fill="var(--accent-strong)" />
        <path d="M44 59 Q60 57 77 66 Q96 57 112 59 L110 78 Q94 74 77 83 Q61 74 45 78 Z" fill="#fff6e8" />
        <path d="M77 66 V82" stroke="#c9bca9" strokeWidth="1.5" />
        <path className="cat-left-lines" d="M51 65 L68 69 M51 70 L67 74" fill="none" stroke="#c9bca9" strokeWidth="1.5" />
        <g className="cat-page">
          <path d="M77 66 Q96 57 112 59 L110 78 Q94 74 77 83 Z" fill="#fff6e8" />
          <path d="M86 69 L104 65 M86 74 L104 70" fill="none" stroke="#c9bca9" strokeWidth="1.5" />
        </g>
        <ellipse className="cat-paw-left" cx="43" cy="70" rx="7" ry="5" fill="#f7ca9c" />
        <ellipse className="cat-paw-right" cx="113" cy="70" rx="7" ry="5" fill="#f7ca9c" />
      </svg>
    </button>
  );
}
