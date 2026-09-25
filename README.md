# Умная библиотека

Full-stack приложение на `Next.js`, `Prisma` и `PostgreSQL` с каталогом книг, профилем читателя, отзывами, избранным, админкой и фундаментом для AI-рекомендаций.

## Основные возможности

- каталог книг с фильтрами и поиском;
- карточка книги с отзывами;
- профиль пользователя и избранное;
- персональные рекомендации с `fallback`-логикой;
- вход через `credentials` и direct `Gmail sign up`;
- админ-панель для `books`, `authors`, `genres`;
- Dockerized PostgreSQL без локальной установки базы.

## Быстрый старт через Docker

### Один запуск для полного setup

```bash
npm run setup
```

Команда автоматически:

- создаст `.env` из `.env.example`, если файла ещё нет;
- поднимет `PostgreSQL` в Docker;
- дождётся готовности контейнера;
- выполнит `Prisma generate`;
- применит migrations;
- заполнит базу demo-данными;
- запустит `Next.js` dev server на `http://localhost:3000`.

Если `Docker Desktop` не запущен, команда остановится с понятной подсказкой.

### 1. Подготовить env

```bash
Copy-Item .env.example .env
```

### 2. Поднять PostgreSQL в Docker

```bash
npm run db:up
```

Контейнер:
- сервис: `postgres`
- контейнер: `smart-library-postgres`
- порт: `5432`

### 3. Применить Prisma и наполнить демо-данными

```bash
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
```

### 4. Запустить приложение

```bash
npm run dev
```

Открыть: `http://localhost:3000`

## Phase A real catalog workflow

```bash
npm run setup
npm run import:books -- design "science fiction" history
npm run dev
```

Что делает этот поток:

- импортирует книги из реальных источников и нормализует их в PostgreSQL;
- кэширует обложки в `public/covers`;
- публикует featured-книги в `/catalog`;
- позволяет повторно запускать импорт через `/admin/import`.

### Проверка Phase A

```bash
npm run verify:phase-a
npm run test:e2e:phase-a
```

`npm run verify:phase-a` последовательно запускает `lint`, `vitest` и production `build`.
`npm run test:e2e:phase-a` прогоняет `smoke.spec.ts` и `catalog-premium.spec.ts`.

## Phase B recommendations workflow

```bash
npm run setup
npm run dev
```

Для проверки Phase B задайте провайдер в `.env`:

```env
AI_PROVIDER=fallback
OPENAI_API_KEY=
GIGACHAT_CLIENT_ID=
GIGACHAT_CLIENT_SECRET=
```

Что делает этот поток:

- рекомендации автоматически пересчитываются после `favorites`, отзывов и reading events;
- fallback snapshot сохраняется сразу, чтобы `/recommendations` не оставался пустым;
- AI enrichment асинхронно улучшает summary и причины на карточках, если настроен `openai` или `gigachat`;
- без внешнего провайдера сценарий продолжает работать через `fallback`.

### Проверка Phase B

```bash
npm run verify:phase-b
npm run test:e2e:phase-b
```

`npm run verify:phase-b` последовательно запускает `lint`, `vitest` и production `build`.
`npm run test:e2e:phase-b` запускает `tests/e2e/recommendations-phase-b.spec.ts` на Playwright dev server с портом `3001` и временно выравнивает `NEXTAUTH_URL` под этот адрес, чтобы credentials login не уходил на `localhost:3000`.

## Phase C AR Preview

```bash
npm run setup
npm run dev
```

Как использовать Phase C:

- откройте любую карточку книги и найдите блок `AR Preview`;
- на desktop можно отсканировать QR-код и продолжить на телефоне;
- маршрут `/ar/books/[slug]` сам выбирает режим предпросмотра:
  - `WebXR AR`, если доступен `immersive-ar`;
  - `3D Preview`, если WebXR недоступен, но доступен 3D renderer;
  - `2D Preview`, если устройство не тянет 3D безопасно.

### Проверка Phase C

```bash
npm run verify:phase-c
npm run test:e2e:phase-c
```

`npm run verify:phase-c` последовательно запускает `lint`, `vitest` и production `build`.
`npm run test:e2e:phase-c` запускает `tests/e2e/ar-preview-phase-c.spec.ts` на Playwright dev server с портом `3001` и временно выравнивает `NEXTAUTH_URL` под этот адрес.

## Phase D Voice Search + PWA

```bash
npm run setup
npm run dev
```

Что включает Phase D:

- голосовой поиск доступен на `/catalog`, `/favorites` и `/recommendations`, если браузер поддерживает `Web Speech API`;
- при отсутствии поддержки микрофона интерфейс остаётся рабочим и продолжает обычный текстовый поиск;
- PWA-регистрация выполняется глобально, а офлайн-баннер показывает состояние сети без блокировки страницы;
- офлайн-повторное открытие поддерживается для `/catalog`, `/favorites`, `/recommendations` и ранее посещённых страниц `/books/[slug]`;
- кэш обложек книг обслуживается через service worker для повторных визитов.

### Проверка Phase D

```bash
npm run verify:phase-d
npm run test:e2e:phase-d
```

`npm run verify:phase-d` последовательно запускает `lint`, `vitest` и production `build`.
`npm run test:e2e:phase-d` запускает `tests/e2e/voice-pwa-phase-d.spec.ts` на Playwright dev server с портом `3001` и временно выравнивает `NEXTAUTH_URL` под этот адрес.

## Google / Gmail OAuth

Для прямой регистрации через Gmail заполните в `.env`:

```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

Также в Google Cloud Console добавьте redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

Для production на `Vercel` добавьте также:

```text
https://<your-domain>/api/auth/callback/google
```

После этого на `/auth/sign-up` и `/auth/sign-in` появится рабочий flow через Gmail без ручного ввода пароля.

## Демо-данные

После `seed` будут созданы:

- администратор: `admin@example.com`
- читатель: `reader@example.com`
- демо-книги:
  - `design-of-everyday-things`
  - `foundation`
  - `game-of-thrones`

Пароли задаются в `prisma/seed.ts`:

- `Admin12345`
- `Reader12345`

## Основные маршруты

- `/` - главная
- `/catalog` - каталог
- `/books/design-of-everyday-things` - демо-карточка книги
- `/auth/sign-in` - вход
- `/auth/sign-up` - Gmail sign up
- `/profile` - профиль пользователя
- `/favorites` - избранное
- `/recommendations` - рекомендации
- `/admin/books` - админка книг
- `/admin/authors` - админка авторов
- `/admin/genres` - админка жанров

## Команды разработки

```bash
npm run db:up
npm run db:logs
npm run db:down
npm run db:deploy
npm run test
npm run test:e2e
npm run lint
npm run build
```

`npm run test` запускает unit/integration suite на `Vitest`, а `npm run test:e2e` отдельно запускает `Playwright smoke`.

## Production / Vercel readiness

Для деплоя на `Vercel` подготовьте:

```env
DATABASE_URL=
AUTH_SECRET=
NEXTAUTH_URL=
VERCEL_PROJECT_PRODUCTION_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AI_PROVIDER=fallback
OPENAI_API_KEY=
GIGACHAT_CLIENT_ID=
GIGACHAT_CLIENT_SECRET=
```

Рекомендуемый порядок:

```bash
npx tsx scripts/phase-e/check-env.ts
npm run build
npm run db:deploy
```

`NEXTAUTH_URL` должен совпадать с публичным production domain.
`VERCEL_PROJECT_PRODUCTION_URL` используется только как backup для metadata/canonical URL logic.
На `Vercel` этот ключ обычно приходит как system environment variable автоматически, поэтому вручную его добавлять не нужно.
Если всё же задаёте его вручную вне `Vercel`, указывайте только домен без `https://` и без завершающего `/`, например `smart-library.example`.

Если внешний AI-провайдер не настроен, приложение продолжит работать через `fallback recommendations`.

Подробный deploy flow вынесен в `docs/operations/vercel-deploy-phase-e.md`.

## Phase E Performance + Vercel

```bash
npm run audit:phase-e:routes
npm run check:env:phase-e
npm run verify:phase-e
npm run test:e2e:phase-e
```

- `audit:phase-e:routes` печатает priority routes для финального optimization pass;
- `check:env:phase-e` проверяет обязательные production env values;
- `verify:phase-e` запускает `lint`, `Vitest` и production `build`;
- `test:e2e:phase-e` делает smoke-run по public routes на Playwright dev server;
- `docs/operations/vercel-deploy-phase-e.md` описывает production deploy flow;
- `docs/operations/lighthouse-phase-e-checklist.md` фиксирует финальный performance review checklist.

## Что уже реализовано

- `Next.js App Router`;
- `Auth.js` + Prisma Adapter;
- `Prisma schema` и Docker PostgreSQL;
- seed и demo data;
- catalog + book detail;
- favorites + profile;
- reviews;
- recommendations + fallback;
- admin books/authors/genres;
- unit, integration và Playwright smoke tests;
- production build readiness.
