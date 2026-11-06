import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { importBooksFromProviders } from "@/lib/import/service";
import { canAccessAdmin } from "@/lib/permissions";
import { schedulePublicationPushes } from "@/lib/pwa/push";

export const maxDuration = 60;

const DEFAULT_IMPORT_QUERIES = ["design", "science fiction", "history", "business"];

function normalizeQueries(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || !canAccessAdmin(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const queries = normalizeQueries(body?.queries);
    const report = await importBooksFromProviders({
      queries: queries.length > 0 ? queries : DEFAULT_IMPORT_QUERIES
    });

    await revalidatePublicCatalogPaths({
      includeAllBookPages: true
    });

    schedulePublicationPushes();
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Import failed"
      },
      { status: 500 }
    );
  }
}
