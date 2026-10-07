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
    "Отвечай на русском языке, если текст/вопрос не требует другого языка.",
    "Сохраняй математические обозначения и формулы. Если материал содержит LaTeX, не упрощай его до plain text. В ответе оформляй inline-формулы как $...$, а отдельные формулы как $$...$$.",
    input.history?.length ? "Контекст предыдущего разговора:\n" + input.history.slice(-10).map((item) => `${item.role === "assistant" ? "AI" : "Пользователь"}: ${item.content}`).join("\n") : "",
    "",
    "Материал:",
    input.text
  ].join("\n");
}

async function openAiGenerate(promptText: string, jobId: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const controller = new AbortController();
  remoteJobs().set(jobId, controller);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_READER_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.15,
        messages: [
          { role: "system", content: "Ты AI Reader. Работай только с предоставленным материалом и явно отмечай нехватку контекста." },
          { role: "user", content: promptText }
        ]
      }),
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}`);
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return payload.choices?.[0]?.message?.content?.trim() || null;
  } finally {
    remoteJobs().delete(jobId);
  }
}

async function generate(promptText: string, maxNewTokens: number, jobId: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey) {
    try {
      const answer = await openAiGenerate(promptText, jobId);
      if (answer) return answer;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw new Error("Cancelled");
      console.error("[reader-ai] remote provider failed, trying local model", error);
    }
  }
  return generateWithLocalReaderModel(promptText, maxNewTokens, jobId);
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
}) {
  const clean = input.text.replace(/\u0000/g, "").trim();
  try {
    if (input.scope === "page" || clean.length <= 24_000) {
      return await generate(prompt({ ...input, text: clean }), 640, input.jobId);
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
      ].join("\n"), 420, input.jobId);
      digests.push(`[Часть ${index + 1}]\n${digest}`);
    }

    return await generate(prompt({ ...input, text: digests.join("\n\n") }), 760, input.jobId);
  } finally {
    clearLocalReaderCancellation(input.jobId);
  }
}
