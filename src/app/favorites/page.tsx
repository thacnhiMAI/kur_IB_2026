import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SearchableFavoritesList } from "@/components/search/searchable-favorites-list";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await requireUser();

  const favorites = await db.favorite.findMany({
    where: { userId: user.id },
    include: {
      book: {
        include: {
          authors: {
            include: {
              author: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Избранное</h1>
        <p className="text-slate-300">Ваши сохранённые книги для быстрого возврата к чтению.</p>
      </div>

      {favorites.length > 0 ? (
        <SearchableFavoritesList
          items={favorites.map((item) => ({
            id: item.id,
            slug: item.book.slug,
            title: item.book.title,
            subtitle: item.book.subtitle,
            authors: item.book.authors.map((entry) => entry.author.name),
            description: item.book.description,
            year: item.book.year
          }))}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center text-slate-300">
          Вы пока не добавили книги в избранное.
        </div>
      )}
    </section>
  );
}
