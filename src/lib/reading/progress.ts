type ProgressInput = {
  progressPercent: number;
  completedAt: Date | null;
};

export function normalizeReadingProgress(input: ProgressInput) {
  const percent = Math.max(0, Math.min(100, Math.round(input.progressPercent)));

  return {
    percent,
    status:
      input.completedAt || percent >= 100
        ? "completed"
        : percent > 0
          ? "in-progress"
          : "not-started"
  } as const;
}

export function getCatalogReadingDot(input: ProgressInput) {
  const normalized = normalizeReadingProgress(input);

  return normalized.status === "completed"
    ? "complete"
    : normalized.status === "in-progress"
      ? "active"
      : "idle";
}
