"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Compass,
  Menu,
  X
} from "lucide-react";

const collections = [
  {
    n: "01",
    label: "ЛИТЕРАТУРА ВНЕ ВРЕМЕНИ",
    title: "Классика, которая\nостаётся с нами",
    text: "От Достоевского до Булгакова — истории, к которым хочется возвращаться.",
    color: "classic",
    books: "Ф. Достоевский · М. Булгаков · Л. Толстой"
  },
  {
    n: "02",
    label: "ПОНИМАТЬ БОЛЬШЕ",
    title: "Большие идеи.\nНовые открытия.",
    text: "Наука, технологии и удивительные ответы на простые вопросы.",
    color: "science",
    books: "С. Хокинг · К. Саган · Ч. Дарвин"
  },
  {
    n: "03",
    label: "ЗА ПРЕДЕЛАМИ ПРИВЫЧНОГО",
    title: "Миры, в которых\nвозможно всё",
    text: "Фантастика и приключения для тех, кому всегда мало одного мира.",
    color: "worlds",
    books: "Ж. Верн · Г. Уэллс · А. Беляев"
  }
];

export function HomepageBlackBlue() {
  const art = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (
      !art.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      event.pointerType === "touch"
    ) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    art.current.style.transform = `perspective(1100px) rotateY(${((event.clientX - bounds.left) / bounds.width - 0.5) * 9}deg) rotateX(${((event.clientY - bounds.top) / bounds.height - 0.5) * -7}deg)`;
  }

  return (
    <div className="homepage-black-blue" id="top">
      <div className="dark-shell">
        <header className="header wrap">
          <a className="brand" href="#top" aria-label="Умная библиотека — главная">
            <span className="brand-icon">
              <BookOpen size={23} />
            </span>
            <span>
              Умная
              <span className="brand-second">
                библиотека<span className="brand-dot">.</span>
              </span>
            </span>
          </a>

          <nav className={menu ? "nav open" : "nav"} aria-label="Основная навигация">
            <a href="#collections" onClick={() => setMenu(false)}>
              Коллекции
            </a>
            <a href="#philosophy" onClick={() => setMenu(false)}>
              О библиотеке
            </a>
            <a className="mobile-external" href="/catalog" onClick={() => setMenu(false)}>
              Перейти в библиотеку ↗
            </a>
          </nav>

          <a className="header-cta" href="/catalog">
            В библиотеку <ArrowUpRight size={17} />
          </a>

          <button
            className="menu-button"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={menu}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </header>

        <main>
          <section
            className="hero wrap"
            onPointerMove={move}
            onPointerLeave={() => {
              if (art.current) {
                art.current.style.transform = "perspective(1100px) rotateY(0) rotateX(0)";
              }
            }}
          >
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="tiny-star">✳</span> ВАША СЛЕДУЮЩАЯ ИСТОРИЯ — ЗДЕСЬ
              </div>
              <h1>
                Откройте книгу.<br />Откройте <em>мир.</em>
              </h1>
              <p className="hero-description">
                Место, где любопытство становится знанием.<br className="desktop" /> Находите новые идеи и книги, которые<br className="desktop" /> останутся с вами.
              </p>
              <a className="primary-button" href="#collections">
                Найти вдохновение <ArrowUpRight size={20} />
              </a>
              <div className="hero-footnote">
                <span className="footnote-icon">
                  <BookOpen size={17} />
                </span>
                <span>Для учёбы. Для открытий. Для себя.</span>
              </div>
            </div>

            <div className="hero-art" ref={art}>
              <div className="art-halo" />
              <img
                className="books-art"
                src="/library-hero.webp"
                alt="Парящие книги с серебристыми орбитами в пространстве чёрно-синей библиотеки"
              />
              <div className="art-tag">
                <span className="tag-symbol">✧</span>
                <span>
                  Каждая книга —<br />
                  <strong>новая вселенная</strong>
                </span>
              </div>
              <span className="art-coordinate">КОЛЛЕКЦИЯ ОТКРЫТИЙ / 2026</span>
            </div>

            <div className="hero-bottom">
              <span>Листайте. Исследуйте. Вдохновляйтесь.</span>
              <a href="#collections" aria-label="Перейти к коллекциям">
                ↓
              </a>
              <span className="edition">01 — ∞</span>
            </div>
          </section>
        </main>
      </div>

      <section className="collections wrap" id="collections">
        <div className="section-heading">
          <div>
            <div className="section-kicker">С ЧЕГО НАЧНЁМ?</div>
            <h2>
              Следуйте за <em>любопытством.</em>
            </h2>
          </div>
          <span className="section-aside">
            Три направления.<br />Бесконечно много открытий.
          </span>
        </div>

        <div className="collection-grid">
          {collections.map((collection) => (
            <article key={collection.n} className={`collection-card ${collection.color}`}>
              <div className="card-top">
                <span>{collection.label}</span>
                <span>{collection.n}</span>
              </div>
              <h3>{collection.title}</h3>
              <p>{collection.text}</p>
              <div className="authors">{collection.books}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="philosophy wrap" id="philosophy">
        <div className="philosophy-icon">
          <Compass size={38} strokeWidth={1} />
        </div>
        <div>
          <div className="section-kicker">БОЛЬШЕ, ЧЕМ КНИЖНАЯ ПОЛКА</div>
          <h2>
            У каждого открытия<br />есть <em>первая страница.</em>
          </h2>
        </div>
        <div className="philosophy-copy">
          <p>
            Хорошая книга приходит вовремя. Помогает разобраться в сложном, увидеть привычное иначе или просто замедлиться.
          </p>
          <p>«Умная библиотека» — ваше пространство для чтения, поиска и новых идей.</p>
          <a href="/catalog">
            Открыть библиотеку <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <footer className="wrap">
        <a className="footer-brand" href="#top">
          <BookOpen size={19} /> Умная библиотека.
        </a>
        <span>Мир шире, когда читаешь.</span>
        <a href="#top">Наверх ↑</a>
      </footer>
    </div>
  );
}
