export function modelUsageUnits(
  model: string,
  input: string,
  output: string,
  usage?: { prompt_tokens: number; completion_tokens: number } | null
) {
  const inputTokens = usage?.prompt_tokens ?? Math.ceil(input.length / 3);
  const outputTokens = usage?.completion_tokens ?? Math.ceil(output.length / 3);
  const weight = /(?:^|[-:])astra(?:$|[-.])/i.test(model) ? 2
    : /(?:^|[-:])luna(?:$|[-.])/i.test(model) ? 0.5 : 1;
  return Math.max(1, Math.ceil((inputTokens + 2 * outputTokens) * weight));
}
