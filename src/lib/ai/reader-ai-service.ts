import { modelUsageUnits } from "@/lib/ai/model-usage";
import { readerFormattingInstruction, readerLanguageInstruction } from "@/lib/ai/reader-answer-style";
import { complete, configuredTarget } from "@/lib/ai/chat-models";

import {
  cancelLocalReaderRequest,
  clearLocalReaderCancellation,
  generateWithLocalReaderModel
} from "@/lib/ai/local-reader-process";

type Action = "summary" | "explain" | "questions" | "ask";
type Scope = "page" | "document";

const REMOTE_JOBS_KEY = "__smartLibraryReaderAiRemoteJobs" as const;

declare global {
  // eslint-disable-next-line no-var
  var __smartLibraryReaderAiRemoteJobs: Map<string, AbortController> | undefined;
}

function remoteJobs() {
  if (!globalThis[REMOTE_JOBS_KEY]) globalThis[REMOTE_JOBS_KEY] = new Map();
  return globalThis[REMOTE_JOBS_KEY]!;
}

function chunks(text: string, size = 18_000) {
  const result: string[] = [];
  for (let offset = 0; offset < text.length; offset += size) result.push(text.slice(offset, offset + size));
  return result;
}

function instruction(action: Action, question?: string) {
  if (action === "summary") return "Сделай точное краткое резюме в структурированных пунктах. Не добавляй факты вне текста.";
  if (action === "explain") return "Объясни содержание простыми словами, сохрани важные термины и причинно-следственные связи.";
  if (action === "questions") return "Составь 7 вопросов для самопроверки и краткие ответы, строго по тексту.";
  return `Ответь на вопрос строго по тексту. Если данных недостаточно, скажи об этом. Вопрос: ${question || ""}`;
}

function prompt(input: { title: string; page?: number; scope: Scope; action: Action; question?: string; text: string; history?: Array<{ role: string; content: string }> }) {
  return [
    `Книга: ${input.title}`,
    input.scope === "page" ? `Режим: текущая страница ${input.page ?? ""}` : "Режим: весь PDF",
    instruction(input.action, input.question),
    readerLanguageInstruction(input.question),
    readerFormattingInstruction,
    "Сохраняй математические обозначения и формулы. Если материал содержит LaTeX, не упрощай его до plain text. В ответе оформляй inline-формулы как $...$, а отдельные формулы как $$...$$.",
    input.history?.length ? "Контекст предыдущего разговора:\n" + input.history.slice(-10).map((item) => `${item.role === "assistant" ? "AI" : "Пользователь"}: ${item.content}`).join("\n") : "",
    "",
    "Материал:",
    input.text
  ].join("\n");
}

async function generate(promptText: string, maxNewTokens: number, jobId: string, onUsage?: (units: number) => void) {
  const target = configuredTarget(process.env.READER_CHAT_MODEL, process.env.OPENAI_READER_MODEL?.trim() || "gpt-4o-mini");
  if (target) {
    const controller = new AbortController();
    remoteJobs().set(jobId, controller);
    try {
      const answer = await complete(target, [
        { role: "system", content: "Ты AI Reader. Работай только с предоставленным материалом и явно отмечай нехватку контекста." },
        { role: "user", content: promptText }
      ], { signal: controller.signal, maxTokens: maxNewTokens });
      onUsage?.(modelUsageUnits(answer.servedModel, promptText, answer.content, answer.usage));
      return answer.content;
    } catch (error) {
      if (controller.signal.aborted) throw new Error("Cancelled");
      console.error("[reader-ai] remote provider failed, trying local model", error instanceof Error ? error.name : "unknown");
    } finally {
      remoteJobs().delete(jobId);
    }
  }
  const content = await generateWithLocalReaderModel(promptText, maxNewTokens, jobId);
  onUsage?.(modelUsageUnits("local", promptText, content));
  return content;
}

export function cancelReaderAiJob(jobId: string) {
  remoteJobs().get(jobId)?.abort();
  remoteJobs().delete(jobId);
  cancelLocalReaderRequest(jobId);
}

export async function answerReaderAi(input: {
  title: string;
  page?: number;
  scope: Scope;
  action: Action;
  question?: string;
  text: string;
  history?: Array<{ role: string; content: string }>;
  jobId: string;
  onUsage?: (units: number) => void;
}) {
  const clean = input.text.replace(/\u0000/g, "").trim();
  try {
    if (input.scope === "page" || clean.length <= 24_000) {
      return await generate(prompt({ ...input, text: clean }), 640, input.jobId, input.onUsage);
    }

    const parts = chunks(clean);
    const digests: string[] = [];
    for (let index = 0; index < parts.length; index += 1) {
      const digest = await generate([
        `Книга: ${input.title}`,
        `Часть PDF ${index + 1} из ${parts.length}.`,
        "Сожми эту часть в фактический конспект, сохрани имена, определения, числа, выводы, связи и математические формулы. LaTeX оставляй в LaTeX. Не выдумывай.",
        "",
        parts[index]
      ].join("\n"), 420, input.jobId, input.onUsage);
      digests.push(`[Часть ${index + 1}]\n${digest}`);
    }

    return await generate(prompt({ ...input, text: digests.join("\n\n") }), 760, input.jobId, input.onUsage);
  } finally {
    clearLocalReaderCancellation(input.jobId);
  }
}
