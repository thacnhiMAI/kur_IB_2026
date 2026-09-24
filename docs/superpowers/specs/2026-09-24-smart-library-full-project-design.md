# Спецификация Full Project: «Умная библиотека»

## 1. Цель

Разработать полноценный выпускной проект `«Умная библиотека»` как production-oriented веб-приложение на `Next.js`, объединяющее:

- реальный каталог книг с фильтрацией и поиском;
- персональные ИИ-рекомендации на основе истории чтения;
- визуально сильный интерфейс с обложками книг и `3D page-flip` эффектами;
- `AR-preview` обложек через `WebXR`;
- голосовой поиск;
- `PWA`-режим с offline-поддержкой каталога;
- авторизацию, профиль пользователя, избранное и отзывы;
- deploy-ready архитектуру для `Vercel`.

Ключевая установка для этого этапа: проект должен опираться на реальные данные и реальные процессы импорта, а не на "demo-only" seed.

## 2. Зафиксированные решения

На этапе проектирования согласованы следующие решения:

- источник данных: `public APIs`, а не локальный demo-only dataset;
- обложки книг: не hotlink, а кэширование в контролируемом нами хранилище;
- AI-интеграция: единый абстрактный слой провайдеров с поддержкой `OpenAI` и `GigaChat`;
- первый implementation phase: `foundation + real data + premium catalog UI`;
- дальнейшая разработка идёт по фазам, но проектируется как целостный full project.

## 3. Границы проекта

### Входит в full project

- каталог книг с фильтрацией по `жанру (genre)`, `автору (author)`, `году (year)`;
- поиск по названию, автору и дополнительным метаданным;
- реальные записи книг, импортированные из внешних источников;
- локально контролируемые обложки книг;
- страница книги с визуальным акцентом на обложку и книжную метафору интерфейса;
- избранное, отзывы, история взаимодействия с книгами;
- персональные рекомендации через `AIProvider` + fallback;
- `AR-preview` книги через `WebXR` и QR-entry;
- голосовой поиск через `Web Speech API`;
- `PWA`: manifest, service worker, offline catalogue cache, подготовка к push-уведомлениям;
- административные операции импорта и управления каталогом;
- deploy на `Vercel`;
- документация для открытого репозитория.

### Не входит в первый implementation phase

Следующие блоки остаются частью общего roadmap, но не являются первыми задачами implementation phase A:

- полноценный `WebXR` runtime;
- production-grade голосовой поиск;
- полностью завершённый `PWA`-контур;
- финальная CI/CD автоматизация и polished production deploy;
- performance hardening под целевые Lighthouse-метрики.

## 4. Архитектурный подход

Выбранный подход: **full-stack монолит на `Next.js App Router` с чёткими внутренними доменными модулями**.

Это позволяет сохранить простой deploy, но при этом разделить проект на понятные зоны ответственности:

- `catalog`
- `book-assets`
- `import`
- `auth`
- `favorites`
- `reviews`
- `reading-history`
- `recommendations`
- `ar-preview`
- `voice-search`
- `pwa`
- `admin`

### Технологический стек

- `Next.js 15` (`App Router`, `SSR`, `SSG`, `ISR`);
- `TypeScript`;
- `Prisma`;
- `PostgreSQL`;
- `Auth.js`;
- `Tailwind CSS`;
- `Zod`;
- `Vitest`;
- `Playwright`;
- `OpenAI` / `GigaChat` через единый AI abstraction layer;
- `Three.js` / `react-three-fiber` для 3D-представления обложек;
- `WebXR` для AR-mode;
- `Web Speech API` для voice search;
- `PWA` tooling для service worker и manifest.

## 5. Delivery Strategy

Проект реализуется фазами, но каждая фаза должна оставлять систему в рабочем состоянии.

### Phase A: Foundation + Real Data + Premium Catalog UI

- расширение `Prisma schema` под реальные библиографические данные;
- import pipeline из `public APIs`;
- кэширование обложек;
- новые seed/import команды;
- визуальное обновление `/catalog` и `/books/[slug]`;
- `3D` hover / page-flip эффекты;
- admin/import operations.

### Phase B: AI Recommendations

- единый `AIProvider`;
- выбор провайдера по `.env`;
- создание и хранение `RecommendationSnapshot`;
- explainable recommendation reasons;
- стабильный fallback.

### Phase C: AR / WebXR

- AR entry-point для книг;
- QR flow;
- 3D cover preview;
- fallback viewer для устройств без `WebXR`.

### Phase D: Voice + PWA

- голосовой поиск;
- `manifest`;
- `service worker`;
- offline cache каталога;
- подготовка модели уведомлений о новинках.

### Phase E: Hardening + Deploy

- тестирование;
- производительность;
- Vercel deploy;
- README и защита проекта.

## 6. Data Architecture

### 6.1 Domain model

Текущая модель `Book` остаётся центральной, но расширяется метаданными реального каталога.

Для `Book` планируется добавить:

- `subtitle`
- `originalTitle`
- `publisher`
- `edition`
- `isbn10`
- `isbn13`
- `ratingAverage`
- `ratingsCount`
- `sourcePrimary`
- `sourceExternalId`
- `isFeatured`
- `isPublished`

Существующие поля `title`, `slug`, `description`, `coverImage`, `year`, `language`, `pages`, `publishedAt` сохраняются и переиспользуются.

### 6.2 Import and source tracking

Добавляется отдельная сущность наподобие `BookSourceRecord` для отслеживания происхождения данных.

Назначение:

- связать книгу с конкретным внешним API;
- хранить внешний идентификатор;
- поддерживать повторный refresh без дублей;
- не смешивать внутреннюю canonical model с техническими деталями импорта.

Пример полей:

- `bookId`
- `provider`
- `externalId`
- `sourceUrl`
- `rawChecksum`
- `lastImportedAt`
- `rawPayload` или ссылка на сохранённый raw snapshot

### 6.3 Cover asset model

Для обложек вводится отдельная сущность наподобие `BookCoverAsset`.

Назначение:

- хранить исходный URL;
- хранить локальный кэшированный путь или публичный asset URL;
- сохранять технические метаданные для UI и PWA.

Пример полей:

- `bookId`
- `originalUrl`
- `cachedPath`
- `publicUrl`
- `width`
- `height`
- `dominantColor`
- `blurDataUrl`
- `status`
- `lastFetchedAt`

## 7. Import Pipeline

Import pipeline должен быть повторяемым, идемпотентным и пригодным не только для первого наполнения, но и для регулярного обновления каталога.

### 7.1 Источники данных

Primary sources для первого этапа:

- `Open Library`
- `Google Books`

Допустимо использовать curated query sets по жанрам, авторам и тематическим подборкам, чтобы наполнить каталог качественными книгами, а не случайной выборкой.

### 7.2 Этапы пайплайна

1. `fetch` данных по выбранным query sets;
2. `normalize` ответа в единый внутренний DTO;
3. `validate` через `Zod`;
4. `dedupe` по приоритету:
   - `isbn13`
   - `isbn10`
   - `title + author + year`
5. `upsert` для `authors`, `genres`, `books`;
6. `download` и кэширование cover assets;
7. генерация UI metadata:
   - `blurDataUrl`
   - `dominantColor`
   - image dimensions
8. сохранение import report.

### 7.3 Import outputs

Каждый import run должен давать отчёт:

- сколько книг добавлено;
- сколько обновлено;
- сколько пропущено как дубликаты;
- сколько записей имеет неполные данные;
- сколько обложек не удалось загрузить.

## 8. Rendering and UX Strategy

### 8.1 Catalog

Страница `/catalog` перестраивается из обычной grid-list в более выразительный `bookshelf`-опыт.

Состав:

- hero section с крупным search input;
- filter bar: `жанр`, `автор`, `год`, сортировка;
- featured shelf;
- main results grid;
- адаптация под mobile и reduced-motion.

### 8.2 Book cards

Карточки книг должны создавать ощущение физического объекта:

- крупная обложка;
- мягкая перспектива;
- объёмная тень;
- имитация толщины книги;
- subtle hover rotation;
- информация о жанре, рейтинге, избранном и авторе.

Эффекты должны быть премиальными, но сдержанными: акцент на polish, а не на визуальный шум.

### 8.3 Book detail page

Страница `/books/[slug]` должна использовать книжную метафору:

- визуальный акцент на обложке;
- плавный переход из каталога;
- `page reveal` / `page flip` при раскрытии подробной информации;
- секции описания, отзывов и рекомендаций оформляются как читаемые "листы", а не как случайный набор блоков.

### 8.4 Cover usage

Обложки становятся первичным визуальным материалом интерфейса.

Обязательные требования:

- приоритет контролируемого кэшированного asset URL;
- blur placeholder;
- color extraction для фоновых градиентов;
- устойчивый fallback при отсутствии обложки.

## 9. AI Recommendations

В проекте уже есть recommendation service и fallback logic. Full project развивает это решение, а не заменяет его.

### 9.1 Architectural rule

Рекомендации всегда вызываются через абстракцию `AIProvider`.

Поддерживаемые провайдеры:

- `OpenAI`
- `GigaChat`
- `fallback`

### 9.2 Recommendation flow

1. агрегируются сигналы пользователя:
   - избранное
   - история чтения
   - завершённые книги
   - жанры и авторы
2. формируется `RecommendationContext`;
3. вызывается внешний AI provider;
4. при неуспехе используется fallback ranking;
5. результаты сохраняются в `RecommendationSnapshot`.

### 9.3 Product requirement

Даже при падении внешнего AI UX не должен становиться пустым. На экране всегда должны быть рекомендации, пусть и с fallback-пояснением.

## 10. AR / WebXR Design

`AR-preview` является частью full project, но проектируется с graceful fallback.

Базовая модель:

- у книги есть `AR entry`;
- пользователь получает QR-code;
- со смартфона открывает AR-preview;
- в AR отображается 3D-представление обложки и краткое описание книги.

Fallback:

- если `WebXR` недоступен, пользователь получает обычный `3D viewer` в браузере;
- если даже 3D невозможен, показывается enhanced 2D preview с теми же данными.

## 11. Voice Search

Voice search строится поверх стандартного текстового поиска, а не отдельно от него.

Принципы:

- общий search state для keyboard и voice input;
- распознавание запроса по названию и автору;
- fallback на manual input;
- отсутствие поддержки `Web Speech API` не ломает поиск.

## 12. PWA Strategy

PWA должна расширять приложение, а не усложнять основную web-версию.

Минимальные требования:

- `manifest`;
- installable app;
- service worker;
- offline cache для ключевых страниц каталога;
- offline access к уже просмотренным книгам;
- архитектурная подготовка для push-уведомлений о новинках.

## 13. Admin and Operations

Админская часть расширяется не только CRUD-операциями, но и operational tools для каталога.

Новые сценарии:

- ручной запуск import jobs;
- refresh существующих книг;
- просмотр import report;
- управление featured books;
- контроль статусов обложек и неполных данных.

## 14. Error Handling

### Import

- ошибки внешнего API логируются и не останавливают весь pipeline;
- частично валидные книги могут импортироваться с флагом review;
- ошибки загрузки обложки не должны валить import run.

### UI

- нет обложки -> красивый fallback cover;
- слабое устройство или `prefers-reduced-motion` -> упрощённая motion-модель;
- unsupported `3D`/`WebXR` -> graceful fallback.

### AI

- ошибка провайдера -> `fallback recommendations`;
- пользователь не должен видеть пустой recommendations screen.

### PWA / Voice / AR

- отсутствие API поддержки переводит пользователя на обычные web-сценарии без поломки основных функций.

## 15. Testing Strategy

### Unit tests

- normalization logic;
- dedupe rules;
- cover asset helpers;
- AI provider adapter boundaries;
- fallback recommendation ranking.

### Integration tests

- import pipeline -> DB upsert;
- recommendation snapshot creation;
- favorite / review / reading-history flows;
- admin import actions.

### E2E

- catalog rendering;
- filtering;
- search;
- book detail page;
- sign-in flow;
- add to favorites;
- recommendations page;
- admin import flow.

### Quality checks

- `lint`
- `build`
- `Vitest`
- `Playwright`
- Lighthouse baseline для главных страниц

## 16. Definition of Done

### Phase A done

- schema расширена под реальные данные;
- import pipeline работает повторяемо;
- обложки кэшируются локально/в контролируемом asset layer;
- `/catalog` и `/books/[slug]` визуально обновлены;
- есть polished `3D` card/detail presentation;
- admin может инициировать импорт или refresh.

### Full project done

- AI recommendations работают через provider abstraction;
- AR-preview имеет working path и fallback;
- voice search usable;
- PWA installable и offline-aware;
- deploy на `Vercel` задокументирован и воспроизводим;
- README и проектная документация достаточны для защиты;
- проект показывает высокое качество UX и инженерной структуры.

## 17. Risks and Constraints

- публичные API могут возвращать неполные или неустойчивые данные;
- внешние cover URLs ненадёжны, поэтому asset caching обязателен;
- `WebXR` и `Web Speech API` имеют ограничения по устройствам и браузерам;
- чрезмерные 3D-эффекты могут ухудшить производительность, поэтому нужны adaptive fallbacks;
- AI quotas и ошибки провайдера неизбежны, поэтому fallback path обязателен по умолчанию.

## 18. Immediate Next Step

Следующий практический шаг после утверждения этой спецификации: создать детальный implementation plan для `Phase A: Foundation + Real Data + Premium Catalog UI`, сохранив совместимость с дальнейшими фазами `AI`, `AR`, `Voice`, `PWA` и `Deploy`.
