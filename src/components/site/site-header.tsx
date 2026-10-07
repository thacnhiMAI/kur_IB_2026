import React from "react";
import { BookOpen, Search } from "lucide-react";
import Link from "next/link";

import { AuthNavClient } from "@/components/auth/auth-nav-client";
import { ThemeQuickToggle } from "@/components/site/theme-quick-toggle";
import { NotificationCenter } from "@/components/notifications/notification-center";

export function SiteHeader() {
  return (
    <header data-testid="site-header" className="dashboard-header">
      <Link href="/" className="dashboard-brand" aria-label="Умная библиотека — главная">
        <span className="dashboard-brand-icon"><BookOpen size={24} strokeWidth={1.9} /></span>
        <span className="dashboard-brand-text">
          <span>Умная</span>
          <span>библиотека<span className="text-[var(--accent-strong)]">.</span></span>
        </span>
      </Link>

      <form action="/catalog" method="get" className="dashboard-global-search" role="search">
        <Search size={19} aria-hidden="true" />
        <input
          type="search"
          name="q"
          placeholder="Найти книги, авторов, жанры..."
          aria-label="Поиск по каталогу"
        />
      </form>

      <div className="dashboard-header-actions">
        <ThemeQuickToggle />
        <NotificationCenter />
        <AuthNavClient variant="compact" />
      </div>
    </header>
  );
}
