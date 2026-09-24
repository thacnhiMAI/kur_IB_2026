import React from "react";
import Link from "next/link";

type AdminSectionNavProps = {
  current: "books" | "authors" | "genres";
};

const items = [
  { key: "books", href: "/admin/books", label: "Books" },
  { key: "authors", href: "/admin/authors", label: "Authors" },
  { key: "genres", href: "/admin/genres", label: "Genres" }
] as const;

export function AdminSectionNav({ current }: AdminSectionNavProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            item.key === current
              ? "bg-cyan-400 text-slate-950"
              : "border border-slate-700 text-slate-200 hover:border-cyan-300 hover:text-cyan-200"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
