import { auth } from "@/auth";
import { cancelReaderJob, queueId, readReaderJob } from "@/lib/ai/agent-queue";

export const dynamic = "force-dynamic";

async function authorize(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.accessBlocked) return { response: new Response(null, { status: 401 }) };
  const id = queueId.safeParse(new URL(request.url).searchParams.get("id"));
  if (!id.success) return { response: new Response(null, { status: 400 }) };
  return { ownerId: session.user.id, id: id.data };
}

export async function GET(request: Request) {
  const access = await authorize(request);
  if (access.response) return access.response;
  const result = await readReaderJob(access.ownerId, access.id);
  return result ? Response.json(result, { headers: { "Cache-Control": "no-store" } }) : new Response(null, { status: 404 });
}

export async function DELETE(request: Request) {
  const access = await authorize(request);
  if (access.response) return access.response;
  await cancelReaderJob(access.ownerId, access.id);
  return new Response(null, { status: 204 });
}
