import Link from "next/link";

export default async function BannedPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const permanent = params.until === "permanent";
  const until = !permanent && params.until ? new Date(params.until) : null;

  return (
    <section className="concept-panel mx-auto max-w-2xl rounded-[32px] p-8 sm:p-10">
      <p className="concept-kicker">Доступ ограничен</p>
      <h1 className="mt-4 text-4xl text-[var(--text-primary)]">Аккаунт заблокирован</h1>
      <p className="mt-5 leading-7 text-[var(--text-secondary)]">
        {permanent
          ? "Администратор заблокировал этот аккаунт без срока окончания."
          : until
            ? `Блокировка действует до ${until.toLocaleString("ru-RU")}.`
            : "Доступ к аккаунту временно ограничен."}
      </p>
      <Link href="/" className="concept-button-secondary mt-7 rounded-full px-5 py-3 text-sm font-semibold">
        На главную
      </Link>
    </section>
  );
}
