import React from "react";

type BookFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  options: {
    authors: Array<{ id: string; name: string }>;
    genres: Array<{ id: string; name: string }>;
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
  };
};

export function BookForm({ action, submitLabel, options, initialValues }: BookFormProps) {
  const selectedAuthorIds = new Set(initialValues?.authorIds ?? []);
  const selectedGenreIds = new Set(initialValues?.genreIds ?? []);

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="title"
          placeholder="Название"
          defaultValue={initialValues?.title ?? ""}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
        />
        <input
          name="slug"
          placeholder="Slug"
          defaultValue={initialValues?.slug ?? ""}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="subtitle"
          placeholder="Подзаголовок"
          defaultValue={initialValues?.subtitle ?? ""}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
        />
        <input
          name="originalTitle"
          placeholder="Оригинальное название"
          defaultValue={initialValues?.originalTitle ?? ""}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
        />
      </div>

      <textarea
        name="description"
        placeholder="Описание"
        rows={5}
        defaultValue={initialValues?.description ?? ""}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="coverImage"
          placeholder="URL обложки"
          defaultValue={initialValues?.coverImage ?? ""}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
        />
        <input
          name="isbn"
          placeholder="ISBN"
          defaultValue={initialValues?.isbn ?? ""}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <input
          name="isbn10"
          placeholder="ISBN-10"
          defaultValue={initialValues?.isbn10 ?? ""}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
        />
        <input
          name="isbn13"
          placeholder="ISBN-13"
          defaultValue={initialValues?.isbn13 ?? ""}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
        />
        <input
          name="publisher"
          placeholder="Издатель"
          defaultValue={initialValues?.publisher ?? ""}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="edition"
          placeholder="Издание"
          defaultValue={initialValues?.edition ?? ""}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <input
          name="year"
          type="number"
          placeholder="Год"
          defaultValue={initialValues?.year ?? new Date().getFullYear()}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
        />
        <input
          name="language"
          placeholder="Язык"
          defaultValue={initialValues?.language ?? "ru"}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
        />
        <input
          name="pages"
          type="number"
          placeholder="Страницы"
          defaultValue={initialValues?.pages ?? 300}
          className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
        />
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-2">
        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={initialValues?.isFeatured ?? false}
            className="h-4 w-4 rounded border-slate-600 bg-slate-950"
          />
          <span>Показывать на витрине</span>
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={initialValues?.isPublished ?? true}
            className="h-4 w-4 rounded border-slate-600 bg-slate-950"
          />
          <span>Опубликовать в каталоге</span>
        </label>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <fieldset className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <legend className="px-2 text-sm font-medium text-slate-200">Авторы</legend>
          <div className="mt-3 space-y-3">
            {options.authors.map((author) => (
              <label key={author.id} className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  name="authorIds"
                  value={author.id}
                  defaultChecked={selectedAuthorIds.has(author.id)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                />
                <span>{author.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <legend className="px-2 text-sm font-medium text-slate-200">Жанры</legend>
          <div className="mt-3 space-y-3">
            {options.genres.map((genre) => (
              <label key={genre.id} className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  name="genreIds"
                  value={genre.id}
                  defaultChecked={selectedGenreIds.has(genre.id)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                />
                <span>{genre.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <button className="rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950">
        {submitLabel}
      </button>
    </form>
  );
}
