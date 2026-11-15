import { afterEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/agent-worker/route";
import { orchestrate } from "@/lib/ai/orchestrator";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({ db: { $queryRaw: vi.fn(), $executeRaw: vi.fn() } }));
const secret = "test-only-" + "a".repeat(32);
const id = "c6290710-6509-4006-94c9-2acee70df71c";
const lease = "7d01ba9b-2704-43f2-9aa0-5c05140e48e0";
function request(action: string, authorized = true, body?: object) {
  return new Request("https://example.test/api/agent-worker?action=" + action, {
    method: "POST", headers: { authorization: authorized ? "Bearer " + secret : "Bearer invalid", "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("rejects unauthorized claims, returns only job fields and rejects stale results", async () => {
  vi.stubEnv("AGENT_WORKER_SECRET", secret);
  expect((await POST(request("claim", false))).status).toBe(401);
  expect(db.$queryRaw).not.toHaveBeenCalled();
  const job = { id, lease, prompt: "Summarize this sample." };
  vi.mocked(db.$queryRaw).mockResolvedValueOnce([job]).mockResolvedValueOnce([]);
  expect(await (await POST(request("claim"))).json()).toEqual(job);
  expect((await POST(request("claim"))).status).toBe(204);
  expect((await POST(request("finish", true, { id, lease, answer: " " }))).status).toBe(400);
  expect(db.$executeRaw).not.toHaveBeenCalled();
  vi.mocked(db.$executeRaw).mockResolvedValueOnce(0).mockResolvedValueOnce(1);
  const result = { id, lease, answer: "A short result." };
  expect((await POST(request("finish", true, result))).status).toBe(409);
  expect((await POST(request("finish", true, result))).status).toBe(204);
});

it("caps delegated work and validates the final result using a mocked model", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test");
  const plan = { level: "simple", tasks: ["A", "B"].map(label => ({ label, instruction: label, level: "simple" })) };
  const reply = (content: string) => Response.json({ choices: [{ message: { content } }] });
  const fetch = vi.fn().mockResolvedValueOnce(reply(JSON.stringify(plan)))
    .mockResolvedValueOnce(reply("Worker note")).mockResolvedValueOnce(reply("Final answer"));
  vi.stubGlobal("fetch", fetch);
  const run = { prompt: "Summarize sample text", limit: 1, steps: [] as import("@/lib/ai/orchestrator").AgentStep[] };
  await orchestrate(run, [{ provider: "google", model: "sample", level: "simple", input: 0, output: 0 }], new AbortController().signal, true);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(run.steps.map(step => step.status)).toEqual(["done", "done", "done"]);
  expect(run.steps.at(-1)?.output).toBe("Final answer");
});

it.each([
  { catalog: [], selected: "codex:default", external: false },
  { catalog: ["external"], selected: "google:missing", external: false },
  { catalog: ["external"], selected: "codex:default", external: false },
  { catalog: ["external"], selected: "google:external", external: true }
])("routes through Codex or an approved external model ($selected)", async ({ catalog, selected, external }) => {
  const generate = vi.fn().mockResolvedValue({ content: "API answer", usage: null, servedModel: "external" });
  const codex = vi.fn().mockResolvedValueOnce({
    content: JSON.stringify({ level: "simple", model: selected, tasks: [] }), usage: null, servedModel: "Codex CLI"
  }).mockResolvedValueOnce({ content: "Codex answer", usage: null, servedModel: "Codex CLI" });
  const run = { prompt: "Summarize this excerpt", limit: 1, steps: [] as import("@/lib/ai/orchestrator").AgentStep[] };
  await orchestrate(run, catalog.map(model => ({ model, provider: "google", level: "standard", input: 1, output: 2 })),
    new AbortController().signal, true, generate, {
      model: { model: "Codex CLI", provider: "openai", level: "complex", input: 0, output: 0 },
      generate: codex, skill: "Select from the catalog."
    });
  expect(generate).toHaveBeenCalledTimes(external ? 1 : 0);
  expect(run.steps.at(-1)?.output).toBe(external ? "API answer" : "Codex answer");
});

it("renews only an active local lease and rejects a lost lease", async () => {
  vi.stubEnv("AGENT_WORKER_SECRET", secret);
  vi.stubEnv("AGENT_LOCAL_QUEUE", "1");
  vi.stubEnv("NODE_ENV", "development");
  vi.mocked(db.$executeRaw).mockResolvedValueOnce(1).mockResolvedValueOnce(0);
  expect((await POST(request("renew", true, { id, lease }))).status).toBe(204);
  expect((await POST(request("renew", true, { id, lease }))).status).toBe(409);
  vi.stubEnv("NODE_ENV", "production");
  expect((await POST(request("renew", true, { id, lease }))).status).toBe(400);
});

it("prioritizes requested Vietnamese over Russian PDF text and history", async () => {
  const complete = vi.fn().mockResolvedValue({ content: "Bản tóm tắt", servedModel: "Codex CLI", usage: null });
  const model = { provider: "openai", model: "codex:default", level: "complex", input: 0, output: 0 } as const;
  await orchestrate({
    prompt: JSON.stringify({ task: "giải thích tóm tắt cho tôi trang này bằng tiếng việt", text: "Русский текст" }),
    limit: 0, steps: []
  }, [], new AbortController().signal, true, complete, { model, generate: complete, skill: "" });
  expect(complete).toHaveBeenCalledWith(model, expect.arrayContaining([
    expect.objectContaining({ role: "system", content: expect.stringContaining("Write the final answer in Vietnamese") })
  ]), expect.anything());
});

it("returns image jobs as separate text and binary data fields", async () => {
  vi.stubEnv("AGENT_WORKER_SECRET", secret);
  const attachment = { mime: "image/png", base64: "iVBORw0KGgo=" };
  const prompt = "Explain this drawing.";
  vi.mocked(db.$queryRaw).mockResolvedValueOnce([{ id, lease, prompt: "reader-image-v1:" + JSON.stringify({ prompt, attachment }) }]);
  const response = await POST(request("claim&vision=1"));
  expect(await response.json()).toEqual({ id, lease, prompt, attachment });
});

it("routes an empty configured catalog to models discovered from Codex CLI", async () => {
  const planner = { provider: "openai", model: "codex:default", level: "complex", input: 0, output: 0 } as const;
  const fast = { ...planner, model: "codex:fast", description: "Fast for routine tasks." };
  const deep = { ...planner, model: "codex:deep", description: "Stronger reasoning." };
  const codex = vi.fn()
    .mockResolvedValueOnce({ content: JSON.stringify({
      level: "complex", model: deep.model, tasks: [{ label: "Extract", instruction: "Extract key ideas", level: "simple", model: fast.model }]
    }), servedModel: planner.model, usage: null })
    .mockResolvedValue({ content: "Result", servedModel: fast.model, usage: null });
  const run = { prompt: "Explain the excerpt", limit: 1, steps: [] as import("@/lib/ai/orchestrator").AgentStep[] };
  await orchestrate(run, [], new AbortController().signal, false, vi.fn(), {
    model: planner, defaultModel: planner, cliModels: [fast, deep], generate: codex, skill: ""
  });
  expect(codex.mock.calls[0][1][0].content).toContain(fast.description);
  expect(codex.mock.calls.map(([model]) => model.model)).toEqual([planner.model, fast.model, deep.model]);
});

it("shows completed Codex reasoning summaries while a step is still running", async () => {
  const { readCodexEvent } = await import("../../../scripts/codex-exec-events");
  expect(readCodexEvent(JSON.stringify({ type: "item.updated", item: { type: "reasoning", text: "Partial" } }))).toBeUndefined();
  expect(readCodexEvent(JSON.stringify({ type: "item.completed", item: { type: "command_execution", text: "Unrelated" } }))).toBeUndefined();
  const event = readCodexEvent(JSON.stringify({
    type: "item.completed", item: { type: "reasoning", text: "Comparing the two definitions." }
  }));
  const model = { provider: "openai", model: "codex:default", level: "complex", input: 0, output: 0 } as const;
  const run = { prompt: "Explain the definitions", limit: 0, steps: [] as import("@/lib/ai/orchestrator").AgentStep[] };
  const onChange = vi.fn(() => {
    if (run.steps[0]?.summaries?.length) {
      expect(run.steps[0].summaries[0].text).toBe("Comparing the two definitions.");
    }
  });
  const codex: typeof import("@/lib/ai/chat-models").complete = async (_model, _messages, options) => {
    if (event?.type === "reasoning") options?.onReasoningSummary?.(event.text);
    expect(run.steps[0].status).toBe("running");
    expect(run.steps[0].summaries).toHaveLength(1);
    return { content: "Summary", servedModel: model.model, usage: null };
  };
  await orchestrate(run, [], new AbortController().signal, false, codex, {
    model, generate: codex, skill: ""
  }, undefined, onChange);
  expect(onChange).toHaveBeenCalledTimes(3);
  expect(run.steps[0].output).toBe("Summary");
});
