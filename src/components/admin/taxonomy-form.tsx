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
    <form action={action} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <input
        name="name"
        placeholder="Отображаемое имя"
        defaultValue={initialValues?.name ?? ""}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
      />
      <input
        name="slug"
        placeholder="slug"
        defaultValue={initialValues?.slug ?? ""}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
      />
      <button className="rounded-lg bg-cyan-400 px-4 py-3 font-medium text-slate-950">
        {submitLabel}
      </button>
    </form>
  );
}
