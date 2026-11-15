import { z } from "zod";

const endpoints = {
  openai: ["https://api.openai.com/v1", "OPENAI_API_KEY"],
  google: ["https://generativelanguage.googleapis.com/v1beta/openai", "GEMINI_API_KEY"],
  openrouter: ["https://openrouter.ai/api/v1", "OPENROUTER_API_KEY"],
  deepseek: ["https://api.deepseek.com", "DEEPSEEK_API_KEY"],
  gateway: ["https://ai-gateway.vercel.sh/v1", "AI_GATEWAY_API_KEY"]
} as const;

const provider = z.enum(["openai", "google", "openrouter", "deepseek", "gateway"]);
export const level = z.enum(["simple", "standard", "complex"]);
const modelSchema = z.object({
  provider, model: z.string().trim().min(1).max(150), level,
  input: z.number().finite().nonnegative(), output: z.number().finite().nonnegative()
});
export type Model = z.infer<typeof modelSchema>;
type Target = Pick<Model, "provider" | "model">;
type Message = { role: "system" | "user"; content: string };

function key(name: Target["provider"]) {
  return process.env[endpoints[name][1]]?.trim() ||
    (name === "gateway" ? process.env.VERCEL_OIDC_TOKEN?.trim() : undefined);
}

export function configuredTarget(value: string | undefined, defaultModel: string): Target | null {
  if (!value) return key("openai") ? { provider: "openai", model: defaultModel } : null;
  const split = value.indexOf(":");
  const name = provider.safeParse(value.slice(0, split));
  const model = value.slice(split + 1).trim();
  if (split < 1 || !name.success || !model || !key(name.data)) return null;
  return { provider: name.data, model };
}

export function configuredModels() {
  const raw = process.env.AGENT_MODELS;
  if (!raw) return [];
  return availableApiModels(JSON.parse(raw));
}

export function availableApiModels(entries: unknown) {
  return z.array(modelSchema).max(40).parse(entries).filter((model) => key(model.provider));
}

export function chooseModel(models: Model[], difficulty: Model["level"], prompt: string, maxTokens: number) {
  const levels = level.options;
  const eligible = models.filter((model) => levels.indexOf(model.level) >= levels.indexOf(difficulty));
  const pool = eligible.length ? eligible : models.filter((model) => model.level ===
    [...models].sort((a, b) => levels.indexOf(b.level) - levels.indexOf(a.level))[0]?.level);
  const estimate = (model: Model) => Math.ceil(prompt.length / 3) * model.input + maxTokens * model.output;
  const best = [...pool].sort((a, b) => estimate(a) - estimate(b))[0];
  if (!best) throw new Error("No configured model");
  return best;
}

export async function complete(target: Target, messages: Message[], options: {
  onReasoningSummary?: (summary: string) => void;
  signal?: AbortSignal; maxTokens?: number; json?: boolean; temperature?: number;
} = {}) {
  const token = key(target.provider);
  if (!token) throw new Error("Missing provider credential");
  const timeout = AbortSignal.timeout(15_000);
  const response = await fetch(endpoints[target.provider][0] + "/chat/completions", {
    method: "POST", redirect: "error", cache: "no-store",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    signal: options.signal ? AbortSignal.any([timeout, options.signal]) : timeout,
    body: JSON.stringify({
      model: target.model, messages,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options.maxTokens ? { [target.provider === "openai" ? "max_completion_tokens" : "max_tokens"]: options.maxTokens } : {}),
      ...(options.json ? { response_format: { type: "json_object" } } : {})
    })
  });
  if (!response.ok) throw new Error(target.provider + " HTTP " + response.status);
  const payload = await response.json();
  const content = z.string().trim().min(1).parse(payload.choices?.[0]?.message?.content);
  const tokens = z.number().int().nonnegative();
  const usage = z.object({ prompt_tokens: tokens, completion_tokens: tokens }).safeParse(payload.usage);
  return { content, usage: usage.success ? usage.data : null, servedModel: typeof payload.model === "string" ? payload.model : target.model };
}
