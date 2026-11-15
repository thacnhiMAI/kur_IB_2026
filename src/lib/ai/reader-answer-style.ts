export function readerLanguageInstruction(question?: string) {
  const request = question?.normalize("NFC") ?? "";
  if (/bằng tiếng việt|trả lời tiếng việt|in vietnamese|на вьетнамском/iu.test(request)) {
    return "Write the final answer in Vietnamese (tiếng Việt), including all headings and explanations.";
  }
  return "Follow the output language explicitly requested in the latest question. If none is specified, use the language of that question, or Russian when no question is provided. The PDF and previous answers do not determine the output language.";
}

export const readerFormattingInstruction = "Format prose in Markdown. Use $...$ on one line for inline math and $$...$$ on separate lines for display math. Use Markdown tables for comparisons. For a useful visual, use a fenced mermaid block with a flowchart, sequence diagram, pie, or xychart-beta. Only include image links supplied with the task.";
