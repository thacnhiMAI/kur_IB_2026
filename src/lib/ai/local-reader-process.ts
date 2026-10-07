import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";

const GLOBAL_KEY = "__smartLibraryLocalReaderAiWorkerV141" as const;
const WORKER_BUILD = "reader-ai-v14.1-tokenizer-batch";

type Pending = { resolve: (value: string) => void; reject: (reason: Error) => void; timer: NodeJS.Timeout; jobId: string };
type WorkerState = {
  process: ChildProcessWithoutNullStreams;
  nextId: number;
  pending: Map<number, Pending>;
  stdoutBuffer: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __smartLibraryLocalReaderAiWorkerV141: WorkerState | undefined;
  // Previous keys are kept only so a hot-reloaded dev server can terminate stale workers.
  // eslint-disable-next-line no-var
  var __smartLibraryLocalReaderAiWorkerV14: WorkerState | undefined;
  // eslint-disable-next-line no-var
  var __smartLibraryLocalReaderAiWorker: WorkerState | undefined;
}

function rejectAll(state: WorkerState, reason: Error) {
  for (const pending of state.pending.values()) {
    clearTimeout(pending.timer);
    pending.reject(reason);
  }
  state.pending.clear();
}

function createWorker(): WorkerState {
  const staleV14 = globalThis.__smartLibraryLocalReaderAiWorkerV14;
  if (staleV14 && !staleV14.process.killed) {
    console.info(`[reader-ai] stopping stale v14 worker before starting ${WORKER_BUILD}`);
    try { staleV14.process.kill(); } catch { /* already gone */ }
  }
  globalThis.__smartLibraryLocalReaderAiWorkerV14 = undefined;

  const staleLegacy = globalThis.__smartLibraryLocalReaderAiWorker;
  if (staleLegacy && !staleLegacy.process.killed) {
    console.info(`[reader-ai] stopping stale pre-v14 worker before starting ${WORKER_BUILD}`);
    try { staleLegacy.process.kill(); } catch { /* already gone */ }
  }
  globalThis.__smartLibraryLocalReaderAiWorker = undefined;
  const python = process.env.PYTHON_BIN?.trim() || (process.platform === "win32" ? "python" : "python3");
  const cacheDir = process.env.LOCAL_AI_HF_HOME?.trim() || (process.platform === "win32" ? "D:\\AIModels\\huggingface\\hub" : "");
  const modelPath = process.env.LOCAL_AI_MODEL_PATH?.trim();
  const script = path.join(process.cwd(), "scripts", "local_reader_ai.py");
  const args = [script, "--serve", ...(cacheDir ? ["--cache-dir", cacheDir] : []), ...(modelPath ? ["--model", modelPath] : [])];
  const inheritedEnv = { ...process.env };
  delete inheritedEnv.TRANSFORMERS_CACHE;
  inheritedEnv.LOCAL_AI_4BIT = process.env.LOCAL_AI_4BIT?.trim() || "1";
  inheritedEnv.LOCAL_AI_CONCURRENCY = process.env.LOCAL_AI_CONCURRENCY?.trim() || "2";
  inheritedEnv.LOCAL_AI_MAX_INPUT_TOKENS = process.env.LOCAL_AI_MAX_INPUT_TOKENS?.trim() || "4096";
  inheritedEnv.LOCAL_AI_MAX_NEW_TOKENS = process.env.LOCAL_AI_MAX_NEW_TOKENS?.trim() || "640";
  if (cacheDir) {
    const normalized = cacheDir.replace(/[\\/]+$/, "");
    inheritedEnv.HF_HOME = process.env.HF_HOME?.trim() || (/[/\\]hub$/i.test(normalized) ? normalized.replace(/[/\\]hub$/i, "") : normalized);
    inheritedEnv.HF_HUB_OFFLINE = "1";
    inheritedEnv.TRANSFORMERS_OFFLINE = "1";
  }
  console.info(`[reader-ai] spawning ${WORKER_BUILD}: ${python} ${args.join(" ")}`);
  const child = spawn(python, args, {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
    env: inheritedEnv
  });
  const state: WorkerState = { process: child, nextId: 1, pending: new Map(), stdoutBuffer: "" };

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    state.stdoutBuffer += chunk;
    while (true) {
      const index = state.stdoutBuffer.indexOf("\n");
      if (index < 0) break;
      const line = state.stdoutBuffer.slice(0, index).trim();
      state.stdoutBuffer = state.stdoutBuffer.slice(index + 1);
      if (!line) continue;
      try {
        const message = JSON.parse(line) as { id?: number; ok?: boolean; answer?: string; error?: string };
        if (!message.id) continue;
        const pending = state.pending.get(message.id);
        if (!pending) continue;
        state.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.ok && message.answer?.trim()) pending.resolve(message.answer.trim());
        else pending.reject(new Error(message.error || "Local AI returned no answer."));
      } catch (error) {
        console.error("[reader-ai] invalid local worker output", error, line.slice(0, 300));
      }
    }
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => console.info(chunk.trimEnd()));
  child.on("exit", (code) => {
    rejectAll(state, new Error(`Local AI worker stopped with code ${code ?? "unknown"}.`));
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

export function generateWithLocalReaderModel(prompt: string, maxNewTokens = 512, jobId = crypto.randomUUID()) {
  const state = worker();
  const id = state.nextId++;
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      state.pending.delete(id);
      cancelLocalReaderRequest(jobId);
      reject(new Error("Local AI request timed out."));
    }, 5 * 60_000);
    state.pending.set(id, { resolve, reject, timer, jobId });
    state.process.stdin.write(`${JSON.stringify({ id, job_id: jobId, prompt, max_new_tokens: maxNewTokens })}\n`);
  });
}

export function cancelLocalReaderRequest(jobId: string) {
  const state = globalThis[GLOBAL_KEY];
  if (!state || state.process.killed || !jobId) return;
  // Do not reject the Node promise immediately. The Python worker checks the
  // cancellation flag from StoppingCriteria and then returns a real Cancelled
  // response. Waiting for that acknowledgement prevents clear_cancel from
  // racing ahead of the GPU generation loop.
  state.process.stdin.write(`${JSON.stringify({ type: "cancel", job_id: jobId })}\n`);
}

export function clearLocalReaderCancellation(jobId: string) {
  const state = globalThis[GLOBAL_KEY];
  if (!state || state.process.killed || !jobId) return;
  state.process.stdin.write(`${JSON.stringify({ type: "clear_cancel", job_id: jobId })}\n`);
}
