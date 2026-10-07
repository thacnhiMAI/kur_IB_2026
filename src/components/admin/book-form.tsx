import React from "react";

import { CoverImageField } from "@/components/admin/cover-image-field";
import { FilterableCheckboxList } from "@/components/admin/filterable-checkbox-list";

type BookFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  options: {
    authors: Array<{ id: string; name: string; slug: string }>;
    genres: Array<{ id: string; name: string; slug: string }>;
  };
  initialValues?: {
    title?: string;
    subtitle?: string | null;
    originalTitle?: string | null;
    slug?: string;
    description?: string;
    coverImage?: string | null;
    year?: number;
    isbn?: string | null;
    isbn10?: string | null;
    isbn13?: string | null;
    publisher?: string | null;
    edition?: string | null;
    language?: string;
    pages?: number;
    isFeatured?: boolean;
    isPublished?: boolean;
    authorIds?: string[];
    genreIds?: string[];
    externalUrl?: string | null;
    contentSummary?: string[];
  };
};

export function BookForm({ action, submitLabel, options, initialValues }: BookFormProps) {
  const selectedAuthorIds = initialValues?.authorIds ?? [];
  const selectedGenreIds = initialValues?.genreIds ?? [];

  return (
    <form action={action} className="editorial-surface space-y-5 rounded-[30px] p-7">
      <div className="space-y-2 border-b border-[var(--surface-border)] pb-5">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--accent-text)]">Контент книги</p>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Metadata и publishing settings</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="title"
          placeholder="Название"
          defaultValue={initialValues?.title ?? ""}
          className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3"
        />
        <input
          name="slug"
          placeholder="Slug"
          defaultValue={initialValues?.slug ?? ""}
          className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="subtitle"
          placeholder="Подзаголовок"
          defaultValue={initialValues?.subtitle ?? ""}
          className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3"
        />
        <input
          name="originalTitle"
          placeholder="Оригинальное название"
          defaultValue={initialValues?.originalTitle ?? ""}
          className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3"
        />
      </div>

      <textarea
        name="description"
        placeholder="Описание"
        rows={5}
        defaultValue={initialValues?.description ?? ""}
        className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <CoverImageField defaultValue={initialValues?.coverImage ?? ""} />
        <input
          name="isbn"
          placeholder="ISBN"
          defaultValue={initialValues?.isbn ?? ""}
          className="self-end rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <input
          name="isbn10"
          placeholder="ISBN-10"
          defaultValue={initialValues?.isbn10 ?? ""}
          className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3"
        />
        <input
          name="isbn13"
          placeholder="ISBN-13"
          defaultValue={initialValues?.isbn13 ?? ""}
          className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3"
        />
        <input
          name="publisher"
          placeholder="Издатель"
          defaultValue={initialValues?.publisher ?? ""}
          className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="edition"
          placeholder="Издание"
          defaultValue={initialValues?.edition ?? ""}
          className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <input
          name="year"
          type="number"
          placeholder="Год"
          defaultValue={initialValues?.year ?? new Date().getFullYear()}
          className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3"
        />
        <input
          name="language"
          placeholder="Язык"
          defaultValue={initialValues?.language ?? "ru"}
          className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3"
        />
        <input
          name="pages"
          type="number"
          placeholder="Страницы"
          defaultValue={initialValues?.pages ?? 300}
          className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3"
        />
      </div>

      <div className="grid gap-4 rounded-[24px] border border-[var(--surface-border)] bg-[rgba(255,255,255,0.02)] p-4 md:grid-cols-2">
        <label className="flex items-center gap-3 text-sm text-[var(--text-primary)]">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={initialValues?.isFeatured ?? false}
            className="h-4 w-4 rounded border-slate-600 bg-[var(--surface-2)]"
          />
          <span>Показывать на витрине</span>
        </label>
        <label className="flex items-center gap-3 text-sm text-[var(--text-primary)]">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={initialValues?.isPublished ?? true}
            className="h-4 w-4 rounded border-slate-600 bg-[var(--surface-2)]"
          />
          <span>Опубликовать в каталоге</span>
        </label>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FilterableCheckboxList
          legend="Авторы"
          name="authorIds"
          items={options.authors}
          initialSelectedIds={selectedAuthorIds}
          placeholder="Поиск по имени или slug..."
        />
        <FilterableCheckboxList
          legend="Жанры"
          name="genreIds"
          items={options.genres}
          initialSelectedIds={selectedGenreIds}
          placeholder="Поиск по имени или slug..."
        />
      </div>

      <fieldset className="rounded-[24px] border border-[var(--surface-border)] bg-[rgba(255,255,255,0.02)] p-5">
        <legend className="px-2 text-sm font-medium text-[var(--text-primary)]">Reading content</legend>
        <div className="mt-4 grid gap-4">
          <label className="space-y-2 text-sm text-[var(--text-primary)]">
            <span>PDF файл</span>
            <input
              type="file"
              name="pdfFile"
              accept="application/pdf"
              className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3"
            />
          </label>
          <label className="space-y-2 text-sm text-[var(--text-primary)]">
            <span>Внешняя ссылка для чтения</span>
            <input
              name="externalUrl"
              defaultValue={initialValues?.externalUrl ?? ""}
              className="w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)]/80 px-4 py-3"
            />
          </label>
          <label className="flex items-center gap-3 text-sm text-[var(--text-primary)]">
            <input
              type="checkbox"
              name="makePdfPrimary"
              className="h-4 w-4 rounded border-slate-600 bg-[var(--surface-2)]"
            />
            <span>Сделать PDF основным источником</span>
          </label>
          {initialValues?.contentSummary?.length ? (
            <div className="rounded-[20px] border border-[var(--surface-border)] bg-[var(--surface-2)]/60 p-4 text-sm text-[var(--text-secondary)]">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Текущие источники
              </p>
              <ul className="mt-3 space-y-2">
                {initialValues.contentSummary.map((item, index) => (
                  <li key={`${index}-${item}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </fieldset>

      <button className="editorial-button-primary rounded-full px-5 py-3 font-medium text-white">
        {submitLabel}
      </button>
    </form>
  );
}
