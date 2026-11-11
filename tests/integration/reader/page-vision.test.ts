// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as askReader } from "@/app/api/reader-ai/route";
import { POST as recognizePage } from "@/app/api/reader-ocr/route";

const { findConversation, transaction } = vi.hoisted(() => ({
  findConversation: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("@/auth", () => ({ auth: async () => ({ user: { id: "reader" } }) }));
vi.mock("@/lib/db", () => ({ db: {
  $transaction: transaction,
  readerAiConversation: { findFirst: findConversation, update: vi.fn() },
  readerAiMessage: { create: vi.fn() }
} }));
vi.mock("@/lib/ai/reader-ai-service", () => ({ answerReaderAi: vi.fn() }));
vi.mock("@/lib/ocr/local-ocr", () => ({ runLocalOcr: vi.fn() }));

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
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("READER_OCR_PROVIDER", "openai");
    vi.stubGlobal("fetch", provider);
    findConversation.mockResolvedValue({ id: "even", page: 110, scope: "page", messages: [] });
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
    provider.mockResolvedValueOnce(Response.json(transcribed));
    const response = await askReader(pageRequest("reader-ai", evenPage));
    expect(await response.json()).toEqual({ answer: "Formula: $x^2$", conversationId: "even" });
    const body = JSON.parse(provider.mock.calls[0][1].body);
    expect(body.input[0].content[0].text).toContain("Page 110");
    expect(transaction).toHaveBeenCalledOnce();
  });

  it("uses the image tool when an illustration is requested", async () => {
    provider.mockResolvedValueOnce(Response.json({ output: [{ type: "image_generation_call", result: "aW1hZ2U=" }] }));
    const response = await askReader(pageRequest("reader-ai", { ...evenPage, output: "image" }));
    expect(await response.json()).toEqual({ image: "aW1hZ2U=", mimeType: "image/jpeg" });
    expect(JSON.parse(provider.mock.calls[0][1].body).tool_choice).toEqual({ type: "image_generation" });
    expect(transaction).not.toHaveBeenCalled();
  });
});
