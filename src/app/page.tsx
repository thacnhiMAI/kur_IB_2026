import React from "react";

import { HomepageBlackBlue } from "@/components/home/homepage-black-blue";

export const metadata = {
  title: "Умная библиотека — откройте новый мир",
  description:
    "Пространство для чтения, поиска и новых идей. Найдите вдохновение в Умной библиотеке.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" }
};

export default function HomePage() {
  return <HomepageBlackBlue />;
}
