import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/permissions";
import { taxonomySchema } from "@/lib/validators/taxonomy";

export async function GET() {
  const authors = await db.author.findMany({
    orderBy: { name: "asc" }
  });

  return NextResponse.json(authors);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || !canAccessAdmin(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = taxonomySchema.parse(body);

  const author = await db.author.create({
    data: parsed
  });

  await revalidatePublicCatalogPaths({
    includeAllBookPages: true
  });

  return NextResponse.json(author, { status: 201 });
}
