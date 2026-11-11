export type BookContentSummary = {
  id: string;
  sourceType: "PDF" | "EXTERNAL_LINK";
  status: "READY" | "PROCESSING" | "FAILED";
  isPrimary: boolean;
  storagePath: string | null;
  publicUrl: string | null;
  externalUrl: string | null;
};

export function resolvePrimaryBookContent<T extends BookContentSummary>(items: T[]) {
  const ordered = [...items].sort(
    (left, right) => Number(right.isPrimary) - Number(left.isPrimary)
  );

  return (
    ordered.find(
      (item) =>
        item.sourceType === "PDF" &&
        item.status === "READY" &&
        item.storagePath
    ) ??
    ordered.find(
      (item) =>
        item.sourceType === "EXTERNAL_LINK" &&
        item.status === "READY" &&
        item.externalUrl
    ) ??
    null
  );
}

export function getReadingEntryMode(
  content: ReturnType<typeof resolvePrimaryBookContent>
): "internal" | "external" | "none" {
  if (!content) {
    return "none";
  }

  return content.sourceType === "PDF" ? "internal" : "external";
}
