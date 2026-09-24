import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { revalidatePublicCatalogPaths } from "@/lib/catalog/public-cache";
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/permissions";
import { taxonomySchema } from "@/lib/validators/taxonomy";

async function ensureAdmin() {
  const session = await auth();
  return Boolean(session?.user && canAccessAdmin(session.user));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = taxonomySchema.parse(body);

  const author = await db.author.update({
    where: { id },
    data: parsed
  });

  await revalidatePublicCatalogPaths({
    includeAllBookPages: true
  });

  return NextResponse.json(author);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await db.author.delete({ where: { id } });

  await revalidatePublicCatalogPaths({
    includeAllBookPages: true
  });

  return NextResponse.json({ success: true });
}
