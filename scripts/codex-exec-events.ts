import { z } from "zod";

const item = z.object({
  type: z.literal("item.completed"),
  item: z.object({ type: z.enum(["reasoning", "agent_message"]), text: z.string() })
});
const usage = z.object({
  type: z.literal("turn.completed"),
  usage: z.object({ input_tokens: z.number().int().nonnegative(), output_tokens: z.number().int().nonnegative() })
});

export function readCodexEvent(line: string) {
  let raw: unknown;
  try { raw = JSON.parse(line); } catch { return undefined; }
  const completedItem = item.safeParse(raw);
  if (completedItem.success) return completedItem.data.item;
  const completedTurn = usage.safeParse(raw);
  if (completedTurn.success) {
    return { type: "usage" as const, usage: {
      prompt_tokens: completedTurn.data.usage.input_tokens,
      completion_tokens: completedTurn.data.usage.output_tokens
    } };
  }
}
