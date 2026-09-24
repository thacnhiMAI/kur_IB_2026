export type ImportResultKind = "added" | "updated" | "skipped";

export type ImportCoverStatus = "ready" | "missing" | "failed";

export type ProviderFailure = {
  provider: string;
  message: string;
};

export type ImportUpsertResult = {
  kind: ImportResultKind;
  bookId: string;
  bookSlug: string;
  coverStatus: ImportCoverStatus;
};

export type ImportReport = {
  queries: string[];
  totalFetched: number;
  added: number;
  updated: number;
  skipped: number;
  coverFailures: number;
  providerFailures: ProviderFailure[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
};

type MutableImportReport = Omit<ImportReport, "finishedAt" | "durationMs">;

export function createImportReport(queries: string[]): MutableImportReport {
  const startedAt = new Date().toISOString();

  return {
    queries,
    totalFetched: 0,
    added: 0,
    updated: 0,
    skipped: 0,
    coverFailures: 0,
    providerFailures: [],
    startedAt
  };
}

export function recordProviderFailure(
  report: MutableImportReport,
  failure: ProviderFailure
) {
  report.providerFailures.push(failure);
}

export function setFetchedCount(
  report: MutableImportReport,
  totalFetched: number
) {
  report.totalFetched = totalFetched;
}

export function recordImportResult(
  report: MutableImportReport,
  result: ImportUpsertResult
) {
  report[result.kind] += 1;

  if (result.coverStatus === "failed") {
    report.coverFailures += 1;
  }
}

export function finalizeImportReport(report: MutableImportReport): ImportReport {
  const finishedAt = new Date().toISOString();

  return {
    ...report,
    finishedAt,
    durationMs: new Date(finishedAt).getTime() - new Date(report.startedAt).getTime()
  };
}

export function formatImportReport(report: ImportReport) {
  const lines = [
    "Import completed.",
    `Queries: ${report.queries.join(", ") || "(none)"}`,
    `Fetched: ${report.totalFetched}`,
    `Added: ${report.added}`,
    `Updated: ${report.updated}`,
    `Skipped: ${report.skipped}`,
    `Cover failures: ${report.coverFailures}`,
    `Provider failures: ${report.providerFailures.length}`,
    `Duration: ${report.durationMs}ms`
  ];

  if (report.providerFailures.length > 0) {
    lines.push(
      ...report.providerFailures.map(
        (failure) => `- ${failure.provider}: ${failure.message}`
      )
    );
  }

  return lines.join("\n");
}
