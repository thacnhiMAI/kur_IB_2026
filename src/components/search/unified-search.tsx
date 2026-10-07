"use client";

import React from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import {
  createVoiceSearchController,
  getVoiceSearchSupport,
  type SpeechRecognitionConstructor
} from "@/lib/search/voice";

type UnifiedSearchProps = {
  label: string;
  placeholder: string;
  initialQuery?: string;
  onQueryChange(query: string): void;
};

type VoiceSearchWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const SSR_SUPPORT = {
  status: "unsupported" as const,
  message: "Голосовой поиск недоступен в этом браузере."
};

export function UnifiedSearch({ label, placeholder, initialQuery = "", onQueryChange }: UnifiedSearchProps) {
  const inputId = useId();
  const stopListeningRef = useRef<(() => void) | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const support = useMemo(
    () => typeof window === "undefined" ? SSR_SUPPORT : getVoiceSearchSupport(window as VoiceSearchWindow),
    []
  );

  useEffect(() => setQuery(initialQuery), [initialQuery]);
  useEffect(() => () => {
    stopListeningRef.current?.();
    stopListeningRef.current = null;
  }, []);

  function updateQuery(nextQuery: string) {
    setQuery(nextQuery);
    setMessage(null);
    onQueryChange(nextQuery);
  }

  function handleVoiceClick() {
    if (isListening) {
      stopListeningRef.current?.();
      stopListeningRef.current = null;
      return;
    }

    if (support.status !== "supported") {
      setMessage(support.message);
      return;
    }

    const voiceController = createVoiceSearchController(() => {
      const target = window as VoiceSearchWindow;
      const Recognition = target.SpeechRecognition ?? target.webkitSpeechRecognition;
      if (!Recognition) throw new Error("Speech recognition is unavailable.");
      return new Recognition();
    });

    setMessage(null);
    stopListeningRef.current = voiceController.start({
      onTranscript: updateQuery,
      onStateChange: (listening) => {
        setIsListening(listening);
        if (!listening) stopListeningRef.current = null;
      },
      onError: setMessage
    });
  }

  return (
    <div className="space-y-3">
      <label htmlFor={inputId} className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>
      <div className="flex gap-3">
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder={placeholder}
          className="concept-input min-w-0 flex-1 rounded-xl px-4 py-3 text-sm"
        />
        <button
          type="button"
          onClick={handleVoiceClick}
          aria-pressed={isListening}
          aria-label={isListening ? "Остановить голосовой поиск" : "Включить голосовой поиск"}
          className="concept-button-secondary rounded-xl px-4 py-3 text-sm font-medium text-[var(--accent-text)]"
        >
          {isListening ? "Слушаю..." : "Голос"}
        </button>
      </div>
      {message ? <p className="text-xs text-[var(--text-muted)]">{message}</p> : null}
    </div>
  );
}
