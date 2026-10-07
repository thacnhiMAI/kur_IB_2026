import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { cancelReaderAiJob } from "@/lib/ai/reader-ai-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ jobId: z.string().min(8).max(160) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.accessBlocked) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  cancelReaderAiJob(parsed.data.jobId);
  return NextResponse.json({ ok: true });
}
