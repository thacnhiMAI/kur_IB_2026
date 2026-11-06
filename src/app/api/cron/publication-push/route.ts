import { deliverPublicationPushes } from "@/lib/pwa/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  await deliverPublicationPushes();
  return Response.json({ ok: true });
}
