import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";

const GLOBAL_KEY = "__smartLibraryLocalOcrWorkerV14Math" as const;

type OcrResult = { text: string; engine: string; mathText?: string };
type Pending = {
  resolve: (value: OcrResult) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
};
type WorkerState = {
  process: ChildProcessWithoutNullStreams;
  nextId: number;
  pending: Map<number, Pending>;
  stdoutBuffer: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __smartLibraryLocalOcrWorkerV14Math: WorkerState | undefined;
}

function rejectAll(state: WorkerState, reason: Error) {
  for (const pending of state.pending.values()) {
    clearTimeout(pending.timer);
    pending.reject(reason);
  }
  state.pending.clear();
}

function createWorker(): WorkerState {
  const python = process.env.PYTHON_BIN?.trim() || (process.platform === "win32" ? "python" : "python3");
  const script = path.join(process.cwd(), "scripts", "reader_ocr.py");
  const languages = process.env.OCR_LANGUAGES?.trim() || "rus+eng+vie";
  const inheritedEnv = { ...process.env };
  delete inheritedEnv.TRANSFORMERS_CACHE;
  inheritedEnv.PYTHONIOENCODING = "utf-8";
  inheritedEnv.PYTHONUNBUFFERED = "1";

  // Math OCR defaults to CPU so it does not compete with the resident Reader AI
  // model for laptop GPU VRAM. Set MATH_OCR_DEVICE=cuda explicitly if desired.
  inheritedEnv.MATH_OCR_DEVICE = process.env.MATH_OCR_DEVICE?.trim() || "cpu";

  console.info(`[reader-ocr] spawning persistent worker: ${python} ${script} --serve`);
  const child = spawn(python, [script, "--serve", "--languages", languages], {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    env: inheritedEnv
  });
  const state: WorkerState = { process: child, nextId: 1, pending: new Map(), stdoutBuffer: "" };

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    state.stdoutBuffer += chunk;
    while (true) {
      const newline = state.stdoutBuffer.indexOf("\n");
      if (newline < 0) break;
      const line = state.stdoutBuffer.slice(0, newline).trim();
      state.stdoutBuffer = state.stdoutBuffer.slice(newline + 1);
      if (!line) continue;
      // Older workers or third-party libraries can emit plain-text diagnostics.
      // Keep those visible without treating them as JSON protocol responses.
      if (!line.startsWith("{")) {
        console.info("[reader-ocr] worker diagnostic:", line.slice(0, 300));
        continue;
      }
      try {
        const message = JSON.parse(line) as { id?: number; ok?: boolean; text?: string; engine?: string; math_text?: string; error?: string };
        if (!message || typeof message !== "object" || !Number.isSafeInteger(message.id) || (message.id ?? 0) <= 0 || typeof message.ok !== "boolean") continue;
        if (typeof message.text !== "undefined" && typeof message.text !== "string") continue;
        if (typeof message.engine !== "undefined" && typeof message.engine !== "string") continue;
        if (typeof message.math_text !== "undefined" && typeof message.math_text !== "string") continue;
        if (typeof message.error !== "undefined" && typeof message.error !== "string") continue;
        if (typeof message.id !== "number") continue;
        const pending = state.pending.get(message.id);
        if (!pending) continue;
        state.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.ok && message.text?.trim()) {
          pending.resolve({ text: message.text.trim(), engine: message.engine || "ocr", mathText: message.math_text?.trim() || undefined });
        } else {
          pending.reject(new Error(message.error || "OCR did not return text."));
        }
      } catch (error) {
        console.error("[reader-ocr] invalid worker output", error, line.slice(0, 300));
      }
    }
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => console.info(chunk.trimEnd()));
  child.on("exit", (code) => {
    rejectAll(state, new Error(`OCR worker stopped with code ${code ?? "unknown"}.`));
    if (globalThis[GLOBAL_KEY] === state) globalThis[GLOBAL_KEY] = undefined;
  });
  child.on("error", (error) => rejectAll(state, error));
  return state;
}

function worker() {
  const current = globalThis[GLOBAL_KEY];
  if (current && !current.process.killed) return current;
  const created = createWorker();
  globalThis[GLOBAL_KEY] = created;
  return created;
}

export function runLocalOcr(imagePath: string, options?: { preferMath?: boolean }) {
  const state = worker();
  const id = state.nextId++;
  const timeoutMs = Math.max(30_000, Number(process.env.OCR_TIMEOUT_MS || 5 * 60_000));
  return new Promise<OcrResult>((resolve, reject) => {
    const timer = setTimeout(() => {
      state.pending.delete(id);
      reject(new Error("OCR request timed out."));
    }, timeoutMs);
    state.pending.set(id, { resolve, reject, timer });
    state.process.stdin.write(`${JSON.stringify({
      id,
      image: imagePath,
      languages: process.env.OCR_LANGUAGES?.trim() || "rus+eng+vie",
      prefer_math: Boolean(options?.preferMath)
    })}\n`);
  });
}
