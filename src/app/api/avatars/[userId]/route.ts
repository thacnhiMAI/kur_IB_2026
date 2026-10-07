import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const avatar = await db.userAvatar.findUnique({ where: { userId }, select: { data: true, mimeType: true, updatedAt: true } });
  if (!avatar) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(avatar.data), {
    status: 200,
    headers: {
      "Content-Type": avatar.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Last-Modified": avatar.updatedAt.toUTCString()
    }
  });
}
