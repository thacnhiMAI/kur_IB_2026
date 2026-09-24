import type { AIProvider, RecommendationContext, RecommendationResult } from "@/lib/ai/provider";
import { recommendationEnrichmentSchema } from "@/lib/recommendations/response-schema";

export class OpenAIProvider implements AIProvider {
  async getRecommendations(context: RecommendationContext): Promise<RecommendationResult> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OpenAI API key is not configured.");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              [
                "You generate concise book recommendation JSON for a book app.",
                "Return only valid JSON matching this shape:",
                '{ "summary": string, "insights": { "favoriteGenres": string[], "favoriteAuthors": string[], "finishedBooks": string[], "highRatedThemes": string[] }, "items": [{ "bookId": string, "reason": string, "badge"?: string }] }',
                "Keep the existing bookId values from the input context."
              ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify(context)
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}.`);
    }

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("OpenAI response did not contain content.");
    }

    return recommendationEnrichmentSchema.parse(JSON.parse(content));
  }
}
