import { describe, expect, it, vi } from "vitest";

import {
  createVoiceSearchController,
  getVoiceSearchSupport
} from "@/lib/search/voice";

describe("voice search", () => {
  it("reports unsupported browsers cleanly", () => {
    expect(getVoiceSearchSupport({})).toEqual({
      status: "unsupported",
      message: "Голосовой поиск недоступен в этом браузере."
    });
  });

  it("detects prefixed speech recognition support", () => {
    expect(
      getVoiceSearchSupport({
        webkitSpeechRecognition: function WebkitSpeechRecognition() {
          return undefined;
        }
      })
    ).toEqual({
      status: "supported"
    });
  });

  it("streams transcript updates into callbacks", () => {
    const start = vi.fn();
    const stop = vi.fn();
    const fakeRecognition = {
      lang: "",
      interimResults: false,
      continuous: false,
      start,
      stop,
      onresult: null as ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null,
      onerror: null as ((event: { error: string }) => void) | null,
      onend: null as (() => void) | null
    };

    const controller = createVoiceSearchController(() => fakeRecognition);
    const onTranscript = vi.fn();
    const onStateChange = vi.fn();

    controller.start({
      onTranscript,
      onStateChange,
      onError: vi.fn()
    });

    fakeRecognition.onresult?.({
      results: [
        [{ transcript: "Дизайн" }],
        [{ transcript: "привычных вещей" }]
      ]
    });

    expect(start).toHaveBeenCalledOnce();
    expect(onStateChange).toHaveBeenCalledWith(true);
    expect(onTranscript).toHaveBeenCalledWith("Дизайн привычных вещей");
  });

  it("maps microphone permission errors to a user-facing message", () => {
    const fakeRecognition = {
      lang: "",
      interimResults: false,
      continuous: false,
      start: vi.fn(),
      stop: vi.fn(),
      onresult: null as ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null,
      onerror: null as ((event: { error: string }) => void) | null,
      onend: null as (() => void) | null
    };

    const controller = createVoiceSearchController(() => fakeRecognition);
    const onError = vi.fn();
    const onStateChange = vi.fn();

    controller.start({
      onTranscript: vi.fn(),
      onStateChange,
      onError
    });

    fakeRecognition.onerror?.({ error: "not-allowed" });

    expect(onError).toHaveBeenCalledWith("Доступ к микрофону запрещён.");
    expect(onStateChange).toHaveBeenLastCalledWith(false);
  });
});
