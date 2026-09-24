import { afterEach, describe, expect, it } from "vitest";

import { GigaChatProvider } from "@/lib/ai/gigachat-provider";
import { OpenAIProvider } from "@/lib/ai/openai-provider";
import { getProvider, getProviderName } from "@/lib/recommendations/service";

describe("recommendation provider selection", () => {
  afterEach(() => {
    delete process.env.AI_PROVIDER;
  });

  it("falls back when no supported provider is configured", () => {
    delete process.env.AI_PROVIDER;

    expect(getProviderName()).toBe("fallback");
    expect(() => getProvider()).toThrow("No external AI provider configured.");
  });

  it("returns OpenAI when configured", () => {
    process.env.AI_PROVIDER = " openai ";

    expect(getProviderName()).toBe("openai");
    expect(getProvider()).toBeInstanceOf(OpenAIProvider);
  });

  it("returns GigaChat when configured", () => {
    process.env.AI_PROVIDER = "gigachat";

    expect(getProviderName()).toBe("gigachat");
    expect(getProvider()).toBeInstanceOf(GigaChatProvider);
  });

  it("treats unsupported providers as fallback", () => {
    process.env.AI_PROVIDER = "anthropic";

    expect(getProviderName()).toBe("fallback");
  });
});
