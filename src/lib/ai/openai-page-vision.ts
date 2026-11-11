import { createHash } from "node:crypto";

import { MAX_PAGE_IMAGE_BYTES } from "@/lib/reading/page-image";

export function isReaderPageImage(value: unknown): value is File {
  return value instanceof File &&
    ["image/png", "image/jpeg"].includes(value.type) &&
    value.size > 0 && value.size <= MAX_PAGE_IMAGE_BYTES;
}

export async function requestPageVision(input: {
  image: File;
  userId: string;
  instructions: string;
  prompt: string;
  output?: "text" | "image";
  signal?: AbortSignal;
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OpenAI vision requires OPENAI_API_KEY.");

  const encoded = Buffer.from(await input.image.arrayBuffer()).toString("base64");
  const generateImage = input.output === "image";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_READER_VISION_MODEL?.trim() || "gpt-4.1-mini",
      store: false,
      safety_identifier: createHash("sha256").update(input.userId).digest("hex"),
      instructions: input.instructions,
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: input.prompt },
          { type: "input_image", image_url: `data:${input.image.type};base64,${encoded}`, detail: "high" }
        ]
      }],
      ...(generateImage ? {
        tools: [{
          type: "image_generation",
          model: process.env.OPENAI_READER_IMAGE_MODEL?.trim() || "gpt-image-1-mini",
          size: "1024x1024",
          quality: "medium",
          output_format: "jpeg",
          output_compression: 75
        }],
        tool_choice: { type: "image_generation" }
      } : { max_output_tokens: 4500 })
    }),
    signal: input.signal,
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`OpenAI Responses HTTP ${response.status}`);

  const result = await response.json() as {
    status?: string;
    output?: Array<{ type: string; result?: string; content?: Array<{ type: string; text?: string }> }>;
  };
  if (result.status === "incomplete" || result.status === "failed") throw new Error("OpenAI did not complete the page request.");
  const text = (result.output ?? []).flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text").map((part) => part.text ?? "").join("\n").trim();
  const image = result.output?.find((item) => item.type === "image_generation_call")?.result;
  if (generateImage ? !image || image.length > 3_800_000 : !text) {
    throw new Error("OpenAI returned no usable page output.");
  }
  return { text, image };
}
