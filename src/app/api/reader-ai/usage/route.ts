import { auth } from "@/auth";
import { readReaderQuota } from "@/lib/ai/reader-quota";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.accessBlocked) return new Response(null, { status: 401 });
  return Response.json(await readReaderQuota(session.user.id), { headers: { "Cache-Control": "no-store" } });
}
