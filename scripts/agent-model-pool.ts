export function createModelPool(limit: number) {
  let active = 0;
  const waiting: Array<() => void> = [];

  return async function schedule<T>(task: () => Promise<T>, signal: AbortSignal): Promise<T> {
    signal.throwIfAborted();
    await new Promise<void>((resolve, reject) => {
      function abort() {
        const index = waiting.indexOf(start);
        if (index >= 0) waiting.splice(index, 1);
        reject(signal.reason);
      }
      function start() {
        signal.removeEventListener("abort", abort);
        active++;
        resolve();
      }
      if (active < limit) {
        start();
      } else {
        waiting.push(start);
        signal.addEventListener("abort", abort, { once: true });
      }
    });

    try {
      signal.throwIfAborted();
      return await task();
    } finally {
      active--;
      waiting.shift()?.();
    }
  };
}
