import React from "react";
import Link from "next/link";

type AdminSection = "books" | "authors" | "genres" | "users" | "reviews" | "import" | "audit";

type AdminSectionNavProps = { current: AdminSection };

const items: Array<{ key: AdminSection; href: string; label: string }> = [
  { key: "books", href: "/admin/books", label: "Книги" },
  { key: "authors", href: "/admin/authors", label: "Авторы" },
  { key: "genres", href: "/admin/genres", label: "Жанры" },
  { key: "users", href: "/admin/users", label: "Пользователи" },
  { key: "reviews", href: "/admin/reviews", label: "Отзывы" },
  { key: "import", href: "/admin/import", label: "Импорт" },
  { key: "audit", href: "/admin/audit", label: "Audit" }
];

export function AdminSectionNav({ current }: AdminSectionNavProps) {
  return (
    <div className="editorial-subtle-surface flex flex-wrap gap-2 rounded-[22px] p-3">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.key === current ? "page" : undefined}
          className={`rounded-full px-4 py-2.5 text-sm font-medium transition ${
            item.key === current
              ? "concept-button-primary text-white"
              : "editorial-button-secondary text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
