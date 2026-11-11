export const highlightPresets = ["yellow", "cyan", "rose"] as const;
export const highlightHexPattern = /^#[0-9a-fA-F]{6}$/;

export function customHighlightColor(color: string) {
  return highlightHexPattern.test(color) ? color : undefined;
}
