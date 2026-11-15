import { afterEach, describe, expect, it, vi } from "vitest";

import { chooseModel, complete, configuredModels, type Model } from "@/lib/ai/chat-models";

const simple: Model = { provider: "google", model: "simple", level: "simple", input: 0.1, output: 0.2 };
const complex: Model = { provider: "deepseek", model: "complex", level: "complex", input: 1, output: 3 };
const expensive: Model = { provider: "openrouter", model: "expensive", level: "complex", input: 5, output: 9 };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("agent model routing", () => {
  it("uses the cheapest model that meets the required level", () => {
    expect(chooseModel([expensive, complex, simple], "simple", "Read a paragraph", 100)).toBe(simple);
    expect(chooseModel([expensive, complex, simple], "complex", "Compare two arguments", 100)).toBe(complex);
  });

  it("uses the strongest configured level when the required level is unavailable", () => {
    const standard = { ...complex, level: "standard" as const };
    expect(chooseModel([simple, standard], "complex", "Compare two arguments", 100)).toBe(standard);
  });

  it("filters unavailable credentials and sends calls only to the configured provider", async () => {
    vi.stubEnv("AGENT_MODELS", JSON.stringify([simple, complex]));
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("DEEPSEEK_API_KEY", "test");
    const models = configuredModels();
    expect(models).toEqual([complex]);
    const fetch = vi.fn().mockResolvedValue(Response.json({
      model: complex.model,
      choices: [{ message: { content: "Answer" } }],
      usage: { prompt_tokens: 12, completion_tokens: 3 }
    }));
    vi.stubGlobal("fetch", fetch);
    const result = await complete(models[0], [{ role: "user", content: "Question" }], { maxTokens: 10 });
    expect(fetch).toHaveBeenCalledWith("https://api.deepseek.com/chat/completions", expect.objectContaining({
      redirect: "error", body: expect.stringContaining('"max_tokens":10')
    }));
    expect(result.usage?.completion_tokens).toBe(3);
  });
});
