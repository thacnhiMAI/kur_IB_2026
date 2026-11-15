type ReaderJob = {
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  answer?: string;
};

function pause(ms: number, signal: AbortSignal) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    function abort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}

export function cancelQueuedReaderJob(jobId: string) {
  return fetch("/api/reader-ai/jobs?id=" + encodeURIComponent(jobId), { method: "DELETE" });
}

export async function waitForReaderJob(jobId: string, signal: AbortSignal, onState: (status: "queued" | "running") => void) {
  let interval = 800;
  let failures = 0;
  const url = "/api/reader-ai/jobs?id=" + encodeURIComponent(jobId);
  while (!signal.aborted) {
    await pause(interval + Math.floor(Math.random() * 250), signal);
    const response = await fetch(url, { cache: "no-store", signal }).catch(() => undefined);
    if (!response || response.status >= 500) {
      if (++failures >= 5) throw new Error("Не удалось получить состояние запроса AI Reader.");
      interval = Math.min(interval * 2, 8000);
      continue;
    }
    if (!response.ok) throw new Error("Запрос AI Reader больше недоступен.");
    failures = 0;
    const job = await response.json() as ReaderJob;
    if (job.status === "done" && job.answer) return job.answer;
    if (job.status === "cancelled") throw new Error("Cancelled");
    if (job.status !== "queued" && job.status !== "running") throw new Error("Agent Studio не завершил запрос. Попробуйте ещё раз.");
    onState(job.status);
    interval = Math.min(Math.round(interval * 1.35), job.status === "queued" ? 5000 : 3000);
  }
  throw signal.reason;
}
