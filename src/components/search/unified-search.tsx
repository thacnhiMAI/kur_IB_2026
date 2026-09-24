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

export function UnifiedSearch({
  label,
  placeholder,
  initialQuery = "",
  onQueryChange
}: UnifiedSearchProps) {
  const inputId = useId();
  const stopListeningRef = useRef<(() => void) | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const support = useMemo(
    () =>
      typeof window === "undefined"
        ? SSR_SUPPORT
        : getVoiceSearchSupport(window as VoiceSearchWindow),
    []
  );

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    return () => {
      stopListeningRef.current?.();
      stopListeningRef.current = null;
    };
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
      const Recognition =
        target.SpeechRecognition ?? target.webkitSpeechRecognition;

      if (!Recognition) {
        throw new Error("Speech recognition is unavailable.");
      }

      return new Recognition();
    });

    setMessage(null);
    stopListeningRef.current = voiceController.start({
      onTranscript: updateQuery,
      onStateChange: (listening) => {
        setIsListening(listening);

        if (!listening) {
          stopListeningRef.current = null;
        }
      },
      onError: (nextMessage) => {
        setMessage(nextMessage);
      }
    });
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-200"
      >
        {label}
      </label>

      <div className="flex gap-3">
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
        />

        <button
          type="button"
          onClick={handleVoiceClick}
          aria-pressed={isListening}
          aria-label={isListening ? "Остановить голосовой поиск" : "Включить голосовой поиск"}
          className="rounded-lg border border-cyan-400/40 px-4 py-3 text-sm font-medium text-cyan-200 transition hover:border-cyan-300 hover:text-cyan-100"
        >
          {isListening ? "Слушаю..." : "Голос"}
        </button>
      </div>

      {message ? <p className="text-xs text-slate-400">{message}</p> : null}
    </div>
  );
}
