import { expect, it } from "vitest";
import { createModelPool } from "../../../scripts/agent-model-pool";
import { modelUsageUnits } from "@/lib/ai/model-usage";

it("shares a model concurrency ceiling across jobs and skips cancelled work", async () => {
  const schedule = createModelPool(2);
  const live = new AbortController();
  const cancelled = new AbortController();
  const releases: Array<() => void> = [];
  let active = 0;
  let peak = 0;
  const task = async () => {
    peak = Math.max(peak, ++active);
    await new Promise<void>(resolve => releases.push(resolve));
    active--;
  };
  const first = schedule(task, live.signal);
  const second = schedule(task, live.signal);
  const stopped = schedule(() => Promise.reject(new Error("Should never start")), cancelled.signal);
  const third = schedule(task, live.signal);
  cancelled.abort(new Error("Cancelled"));
  await expect(stopped).rejects.toThrow("Cancelled");
  expect(peak).toBe(2);
  releases[0]();
  await first;
  releases.slice(1).forEach(release => release());
  await Promise.all([second, third]);
  expect(peak).toBe(2);
});

it("uses measured usage and weights expensive and light models differently", () => {
  const usage = { prompt_tokens: 200, completion_tokens: 50 };
  expect(modelUsageUnits("codex:gpt-6-astra", "", "", usage)).toBe(600);
  expect(modelUsageUnits("codex:gpt-6-luna", "", "", usage)).toBe(150);
  expect(modelUsageUnits("unknown", "abc", "abc")).toBe(3);
});
