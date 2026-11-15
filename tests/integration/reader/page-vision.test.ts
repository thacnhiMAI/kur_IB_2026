// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as askReader } from "@/app/api/reader-ai/route";
import { POST as recognizePage } from "@/app/api/reader-ocr/route";

const { findConversation, findMessages, transaction, runLocalOcr, queueReaderTask, reserveReaderQuota, settleReaderQuota } = vi.hoisted(() => ({
  findConversation: vi.fn(),
  findMessages: vi.fn(),
  transaction: vi.fn(),
  runLocalOcr: vi.fn(),
  queueReaderTask: vi.fn(),
  reserveReaderQuota: vi.fn(),
  settleReaderQuota: vi.fn()
}));

vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: "reader" } }) }));
vi.mock("@/lib/db", () => ({ db: {
  $transaction: transaction,
  readerAiConversation: { findFirst: findConversation, update: vi.fn() },
  readerAiMessage: { create: vi.fn(), findMany: findMessages }
} }));
vi.mock("@/lib/ai/reader-ai-service", () => ({ answerReaderAi: vi.fn() }));
vi.mock("@/lib/ocr/local-ocr", () => ({ runLocalOcr }));

vi.mock("@/lib/ai/reader-quota", () => ({ reserveReaderQuota, settleReaderQuota }));
vi.mock("@/lib/ai/agent-queue", () => ({ queueReaderTask, ReaderQueueFull: class extends Error {} }));

function pageRequest(path: string, payload?: object) {
  const form = new FormData();
  form.set("image", new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "page-110.png", { type: "image/png" }));
  if (payload) form.set("payload", JSON.stringify(payload));
  return new Request(`https://reader.example/api/${path}`, { method: "POST", body: form });
}

const evenPage = { action: "explain", scope: "page", page: 110, title: "Database Design", jobId: "job-page-110", conversationId: "even" };
const transcribed = { output: [{ type: "message", content: [{ type: "output_text", text: "Formula: $x^2$" }] }] };

describe("OpenAI page vision", () => {
  const provider = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    reserveReaderQuota.mockResolvedValue({ reservation: { units: 256 } });
    settleReaderQuota.mockResolvedValue(undefined);
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("READER_OCR_PROVIDER", "openai");
    vi.stubGlobal("fetch", provider);
    findConversation.mockResolvedValue({ id: "even", page: 110, scope: "page", bookId: "book", contentId: "pdf" });
    findMessages.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("transcribes an uploaded OCR page with its LaTeX", async () => {
    provider.mockResolvedValueOnce(Response.json(transcribed));
    const response = await recognizePage(pageRequest("reader-ocr"));
    expect(await response.json()).toEqual({ text: "Formula: $x^2$", engine: "openai-vision" });
    const [url, request] = provider.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/responses");
    expect(JSON.parse(request.body).input[0].content[1]).toMatchObject({
      type: "input_image", image_url: expect.stringMatching(/^data:image\/png;base64,/)
    });
  });

  it("sends page 110 from its own conversation and returns the text", async () => {
    findMessages.mockResolvedValueOnce([
      { role: "assistant", content: "Earlier explanation", conversation: { page: 109 } },
      { role: "user", content: "What does this mean?", conversation: { page: 109 } }
    ]);
    provider.mockResolvedValueOnce(Response.json(transcribed));
    const response = await askReader(pageRequest("reader-ai", evenPage));
    expect(await response.json()).toEqual({ answer: "Formula: $x^2$", conversationId: "even" });
    const body = JSON.parse(provider.mock.calls[0][1].body);
    expect(body.input[0].content[0].text).toContain("page 110");
    expect(body.input[0].content[0].text).toContain("[Page 109] Earlier explanation");
    expect(findMessages).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ conversation: { userId: "reader", bookId: "book", contentId: "pdf" } }),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    }));
    expect(transaction).toHaveBeenCalledOnce();
  });

  it("queues both the question and original image without an OpenAI key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("READER_AGENT_QUEUE", "1");
    queueReaderTask.mockResolvedValueOnce({ jobId: "queued-id" });
    const response = await askReader(pageRequest("reader-ai", {
      ...evenPage, action: "ask", question: "Giải thích bằng tiếng Việt"
    }));
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ jobId: "queued-id", status: "queued" });
    expect(queueReaderTask).toHaveBeenCalledWith("reader", expect.stringContaining("Giải thích bằng tiếng Việt"),
      expect.any(AbortSignal), { mime: "image/png", base64: "iVBORw0KGgo=" },
      expect.objectContaining({ reservation: { units: 256 }, conversationId: "even" }));
    expect(runLocalOcr).not.toHaveBeenCalled();
    expect(settleReaderQuota).not.toHaveBeenCalled();
    expect(provider).not.toHaveBeenCalled();
  });

  it("rejects a request before invoking the model when either usage window is exhausted", async () => {
    reserveReaderQuota.mockResolvedValueOnce({ reservation: null, quota: { short: { used: 120000, limit: 120000 } } });
    const response = await askReader(pageRequest("reader-ai", evenPage));
    expect(response.status).toBe(429);
    expect(provider).not.toHaveBeenCalled();
    expect(queueReaderTask).not.toHaveBeenCalled();
    expect(settleReaderQuota).not.toHaveBeenCalled();
  });

  it("generates an image from the prompt alone", async () => {
    provider.mockResolvedValueOnce(Response.json({ output: [{ type: "image_generation_call", result: "aW1hZ2U=" }] }));
    const response = await askReader(new Request("https://reader.example/api/reader-ai", {
      method: "POST", body: JSON.stringify({ ...evenPage, action: "ask", question: "Draw a blue cat", output: "image" })
    }));
    expect(await response.json()).toEqual({ image: "aW1hZ2U=", mimeType: "image/jpeg" });
    const body = JSON.parse(provider.mock.calls[0][1].body);
    expect(body.tool_choice).toEqual({ type: "image_generation" });
    expect(body.input[0].content).toEqual([{ type: "input_text", text: "Draw a blue cat" }]);
    expect(transaction).not.toHaveBeenCalled();
  });
});
