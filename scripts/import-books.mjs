import "dotenv/config";

import { DEFAULT_IMPORT_QUERIES, importBooksFromProviders } from "../src/lib/import/service.ts";
import { formatImportReport } from "../src/lib/import/report.ts";

const queries = process.argv.slice(2).map((value) => value.trim()).filter(Boolean);

const report = await importBooksFromProviders({
  queries: queries.length > 0 ? queries : DEFAULT_IMPORT_QUERIES
});

console.log(formatImportReport(report));
