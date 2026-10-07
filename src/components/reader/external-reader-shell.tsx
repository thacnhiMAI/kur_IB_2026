import Link from "next/link";

export function ExternalReaderShell({
  title,
  slug,
  href
}: {
  title: string;
  slug: string;
  href: string;
}) {
  return (
    <section className="concept-panel rounded-[34px] p-8 sm:p-10">
      <p className="concept-eyebrow">External reader</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        <Link href={`/books/${slug}`} className="transition hover:text-[var(--accent-text)]">
          {title}
        </Link>
      </h1>
      <p className="mt-4 max-w-2xl leading-7 text-[var(--text-secondary)]">
        Эта книга доступна во внешнем источнике. Ссылка откроется в новой вкладке.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="concept-button-primary mt-7 inline-flex rounded-full px-6 py-3 text-sm font-semibold"
      >
        Открыть внешний источник ↗
      </a>
    </section>
  );
}
