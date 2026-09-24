import type { VoiceSupportState } from "@/lib/search/types";

const UNSUPPORTED_MESSAGE = "Голосовой поиск недоступен в этом браузере.";
const START_FAILURE_MESSAGE = "Не удалось запустить голосовой поиск.";
const MICROPHONE_DENIED_MESSAGE = "Доступ к микрофону запрещён.";
const RECOGNITION_FAILURE_MESSAGE = "Не удалось распознать речь.";

type SpeechRecognitionResultEntryLike = {
  transcript: string;
};

type SpeechRecognitionResultListLike =
  ArrayLike<ArrayLike<SpeechRecognitionResultEntryLike>>;

export type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: SpeechRecognitionResultListLike }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export type VoiceSearchTarget = {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type VoiceSearchCallbacks = {
  onTranscript(transcript: string): void;
  onStateChange(listening: boolean): void;
  onError(message: string): void;
};

function getSpeechRecognitionConstructor(target: VoiceSearchTarget) {
  return target.SpeechRecognition ?? target.webkitSpeechRecognition;
}

function getVoiceErrorMessage(error: string) {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return MICROPHONE_DENIED_MESSAGE;
    default:
      return RECOGNITION_FAILURE_MESSAGE;
  }
}

export function getVoiceSearchSupport(target: VoiceSearchTarget): VoiceSupportState {
  if (!getSpeechRecognitionConstructor(target)) {
    return {
      status: "unsupported",
      message: UNSUPPORTED_MESSAGE
    };
  }

  return { status: "supported" };
}

export function createVoiceSearchController(factory: () => SpeechRecognitionLike) {
  let stopActiveRecognition: (() => void) | null = null;

  return {
    start({ onTranscript, onStateChange, onError }: VoiceSearchCallbacks) {
      stopActiveRecognition?.();

      const recognition = factory();
      let finished = false;

      const finish = () => {
        if (finished) {
          return;
        }

        finished = true;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;

        if (stopActiveRecognition === stop) {
          stopActiveRecognition = null;
        }

        onStateChange(false);
      };

      const stop = () => {
        if (finished) {
          return;
        }

        try {
          recognition.stop();
        } catch {
          // Some browser implementations throw if stop is called before start settles.
        }

        finish();
      };

      recognition.lang = "ru-RU";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .flatMap((result) => Array.from(result))
          .map((entry) => entry.transcript.trim())
          .filter(Boolean)
          .join(" ")
          .trim();

        if (transcript) {
          onTranscript(transcript);
        }
      };
      recognition.onerror = (event) => {
        onError(getVoiceErrorMessage(event.error));
        finish();
      };
      recognition.onend = finish;

      onStateChange(true);
      stopActiveRecognition = stop;

      try {
        recognition.start();
      } catch {
        onError(START_FAILURE_MESSAGE);
        finish();
      }

      return stop;
    },
    stop() {
      stopActiveRecognition?.();
    }
  };
}
