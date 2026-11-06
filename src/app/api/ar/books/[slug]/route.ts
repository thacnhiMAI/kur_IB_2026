import { getBookDetailPageData } from "@/lib/catalog/service";
import { toARBookPayload } from "@/lib/books/presenters";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await getBookDetailPageData(slug);
  if (!book) return new Response(null, { status: 404 });
  return Response.json(toARBookPayload(book));
}
