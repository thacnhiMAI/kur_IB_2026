import React from "react";

type TaxonomyFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  initialValues?: {
    name?: string;
    slug?: string;
  };
};

export function TaxonomyForm({
  action,
  submitLabel,
  initialValues
}: TaxonomyFormProps) {
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-1)] p-6">
      <input
        name="name"
        placeholder="Отображаемое имя"
        defaultValue={initialValues?.name ?? ""}
        className="w-full rounded-lg border border-[var(--surface-border-strong)] bg-[var(--surface-2)] px-4 py-3"
      />
      <input
        name="slug"
        placeholder="slug"
        defaultValue={initialValues?.slug ?? ""}
        className="w-full rounded-lg border border-[var(--surface-border-strong)] bg-[var(--surface-2)] px-4 py-3"
      />
      <button className="rounded-lg concept-button-primary px-4 py-3 font-medium text-white">
        {submitLabel}
      </button>
    </form>
  );
}
