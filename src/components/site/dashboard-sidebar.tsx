"use client";

import {
  Bookmark,
  Book,
  BookOpen,
  Home,
  LibraryBig,
  ShieldCheck,
  Sparkles,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { ReadingCat } from "@/components/site/reading-cat";

const SIDEBAR_STORAGE_KEY = "smart-library:sidebar-collapsed:v1";

const baseItems = [
  { href: "/", label: "Главная", icon: Home },
  { href: "/catalog", label: "Каталог", icon: LibraryBig },
  { href: "/recommendations", label: "Рекомендации", icon: Sparkles },
  { href: "/favorites", label: "Избранное", icon: Bookmark },
  { href: "/profile", label: "Профиль", icon: UserRound }
] as const;

function isActive(pathname: string | null, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname?.startsWith(`${href}/`);
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let active = true;
    void getSession().then((session) => {
      if (active) setIsAdmin(session?.user?.role === "ADMIN");
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    let next = false;
    try {
      next = window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
    } catch {
      next = false;
    }
    setCollapsed(next);
    document.documentElement.dataset.sidebarCollapsed = next ? "true" : "false";

    return () => {
      delete document.documentElement.dataset.sidebarCollapsed;
    };
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.dataset.sidebarCollapsed = next ? "true" : "false";
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
    } catch {
      // The sidebar still works when storage is unavailable.
    }
  }

  const items = isAdmin
    ? [...baseItems, { href: "/admin", label: "Админ", icon: ShieldCheck } as const]
    : baseItems;

  return (
    <aside className="dashboard-sidebar" aria-label="Основная навигация" data-collapsed={collapsed ? "true" : "false"}>
      <button
        type="button"
        onClick={toggleCollapsed}
        className="dashboard-sidebar-toggle"
        aria-label={collapsed ? "Развернуть боковую панель" : "Свернуть боковую панель"}
        title={collapsed ? "Развернуть панель" : "Свернуть панель"}
        aria-expanded={!collapsed}
      >
        {collapsed ? <Book size={20} /> : <BookOpen size={20} />}
      </button>

      <ReadingCat />

      <nav className="dashboard-sidebar-nav">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={collapsed ? item.label : undefined}
              title={collapsed ? item.label : undefined}
              className={`dashboard-sidebar-link ${active ? "is-active" : ""}`}
            >
              <Icon size={20} strokeWidth={1.9} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
