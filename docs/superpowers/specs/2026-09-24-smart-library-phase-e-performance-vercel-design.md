# Спецификация Phase E: Оптимизация производительности + Deploy на Vercel

## 1. Цель

Реализовать `Phase E` как завершающий этап повышения production-readiness проекта `«Умная библиотека»`, объединив:

- оптимизацию производительности ключевых пользовательских маршрутов;
- улучшение `Lighthouse`-показателей;
- стабилизацию production-конфигурации;
- подготовку и закрепление deploy flow для `Vercel`;
- сохранение совместимости с уже реализованными `Phase A-D`.

Phase E не должен превращаться в новый функциональный этап. Его задача — довести существующее приложение до более зрелого, демонстрационного и deploy-ready состояния без расползания scope в новые продуктовые фичи.

## 2. Зафиксированные решения

Для этого этапа согласованы следующие решения:

- работа идёт **одновременно** по двум направлениям: `performance optimization + deploy readiness`;
- основной deploy target: **Vercel**;
- база данных остаётся в модели **self-managed PostgreSQL / Docker-managed infrastructure**;
- целевой уровень качества:
  - `Performance >= 90`
  - высокий уровень `Accessibility`
  - высокий уровень `Best Practices`
  - высокий уровень `SEO`
- рекомендуется подход: **route/render optimization + asset optimization + production config + deploy checklist**;
- при конфликте между несколькими micro-optimizations и стабильностью приложения приоритет отдаётся **устойчивости, UX и предсказуемому deploy**, а не погоне за максимальным баллом любой ценой.

## 3. Product Scope

### Входит в scope Phase E

- аудит ключевых маршрутов и выявление bottleneck-ов;
- оптимизация render-path для основных страниц;
- оптимизация static assets, cover delivery, fonts и metadata;
- сокращение ненужной client-side нагрузки и hydration cost там, где это оправдано;
- production configuration hardening;
- Vercel deploy readiness;
- documentation для production env и deploy flow;
- финальный verification flow для Phase E;
- фиксация Lighthouse/manual audit checklist.

### Не входит в scope Phase E

- создание новых продуктовых модулей;
- переработка recommendation logic как новой фичи;
- расширение AR/PWA за пределы уже утверждённых фаз;
- перенос БД на managed provider;
- масштабный рефакторинг всего проекта без прямой связи с performance или deploy;
- полноценная DevOps-платформа с CI/CD orchestration beyond current project needs.

## 4. Phase Outcome

После завершения Phase E приложение должно:

- быстрее и чище загружать ключевые публичные маршруты;
- иметь понятный production deploy path для `Vercel`;
- иметь согласованную production-конфигурацию для auth, DB и runtime assumptions;
- сохранять работоспособность каталога, рекомендаций, AR и PWA;
- быть подготовленным к демонстрации, финальной проверке и публикации.

Результат этапа оценивается не по одной метрике, а по сочетанию:

- фактической отзывчивости;
- стабильности production build;
- deploy predictability;
- убедительных `Lighthouse`-показателей;
- отсутствия регрессий относительно уже реализованных фаз.

## 5. Priority Routes

Основной приоритет оптимизации:

1. `/`
2. `/catalog`
3. `/books/[slug]`
4. `/recommendations`

Эти маршруты представляют основной пользовательский путь и сильнее всего влияют на демонстрационное качество проекта.

Secondary priority:

- global app shell;
- shared layout;
- auth navigation block;
- PWA bootstrap/offline shell;
- supporting static assets.

## 6. Architecture

Phase E рекомендуется разделить на несколько чётких модулей, чтобы performance work, deploy readiness и documentation не смешивались в один размытый поток изменений.

### 6.1 `perf-audit`

Модуль или workflow, отвечающий за измерение и фиксацию проблемных мест.

Ответственность:

- собрать базовую картину по основным маршрутам;
- выявить тяжёлые изображения, лишний JS, hydration-heavy участки;
- зафиксировать route-specific issues для дальнейших изменений;
- определить, какие проблемы влияют на `Lighthouse`, а какие — на реальную UX latency.

Этот слой не должен реализовывать оптимизации сам по себе. Его задача — формализовать приоритеты.

### 6.2 `render-optimization`

Слой, отвечающий за page rendering strategy и client/server boundaries.

Ответственность:

- удерживать server rendering там, где это выгодно;
- не раздувать client component boundaries без необходимости;
- снижать unnecessary re-rendering и hydration cost;
- минимизировать передачу лишних данных в client wrappers.

Основные target-зоны:

- `catalog`
- `book detail`
- `recommendations`
- shared layout/shell

### 6.3 `asset-optimization`

Слой оптимизации static и media assets.

Ответственность:

- проверить image sizing;
- убедиться, что `next/image` и local cover delivery используются последовательно;
- оптимизировать font loading strategy;
- привести metadata, icons и discovery assets в production-friendly вид;
- зафиксировать корректное поведение внутренних cover assets в deploy environment.

### 6.4 `production-config`

Слой production hardening для runtime configuration.

Ответственность:

- нормализовать env contracts;
- зафиксировать production expectations для `NEXTAUTH_URL`;
- определить production-safe DB connection requirements;
- закрепить Prisma deploy/migration strategy;
- исключить локальные предположения, завязанные на `localhost`.

### 6.5 `vercel-deploy`

Слой deploy target readiness.

Ответственность:

- закрепить build/runtime assumptions для `Vercel`;
- определить обязательные environment variables;
- описать ограничения и условия доступа к self-managed PostgreSQL;
- описать практический deploy flow: initial deploy, env setup, redeploy, sanity-check.

### 6.6 `phase-e-verification`

Финальный verification layer.

Ответственность:

- запуск `lint`, `tests`, `build`;
- проверка отсутствия регрессий на ключевых страницах;
- фиксация проверок production readiness;
- закрепление `Lighthouse`/manual audit checklist.

## 7. Optimization Strategy

Оптимизация Phase E должна идти сверху вниз — от заметных bottleneck-ов к более мелким улучшениям.

### 7.1 Route-first optimization

Сначала оптимизируются user-facing маршруты с максимальной демонстрационной ценностью:

- landing/root;
- catalog experience;
- book detail;
- recommendations.

Если route уже быстрый и устойчивый, его не нужно переписывать только ради косметического изменения architecture.

### 7.2 Hydration discipline

Нужно избегать ситуации, когда client-side behavior расширяется шире, чем требуется UX.

Принципы:

- client components должны быть локальными и узкими по границам;
- server components остаются серверными, если нет явной интерактивной причины переносить их в client;
- shared wrappers не должны тянуть в client больше данных, чем реально используется в UI.

### 7.3 Asset discipline

Особое внимание:

- cover assets;
- hero/preview imagery;
- icon set;
- font strategy;
- metadata completeness для public routes.

Цель — уменьшить initial load cost без потери визуального качества premium UI.

### 7.4 Balanced optimization

Если какой-то шаг повышает метрику, но:

- ухудшает кодовую ясность;
- ломает UX;
- делает deploy менее предсказуемым;
- создаёт regressions в уже реализованных фазах,

то такой шаг не считается успешной оптимизацией.

## 8. Deploy Strategy

Deploy target — `Vercel`, но база данных остаётся вне managed platform lifecycle.

Это означает:

- frontend/app runtime и server functions ориентируются на `Vercel`;
- database остаётся в self-managed environment;
- env configuration должна быть достаточно ясной, чтобы deploy не зависел от неявных локальных состояний.

## 8.1 Production configuration expectations

Для production deploy должны быть чётко определены:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `AUTH_SECRET` / эквивалентный auth secret
- OAuth callback-related values
- AI provider env variables, если они используются в recommendations

Все обязательные env values должны быть отражены в документации.

## 8.2 Auth deploy readiness

Особое внимание нужно уделить:

- callback URL consistency;
- отличию между `localhost`, `127.0.0.1` и production domain;
- отсутствию жёстко вшитых локальных redirect assumptions.

Цель — избежать ситуации, где локально auth работает, а на production возникают redirect loops или callback mismatch.

## 8.3 Prisma / database deploy readiness

Нужно закрепить:

- production-safe migration strategy;
- ожидания по запуску `prisma generate` и deploy build;
- ограничения доступа `Vercel` к self-hosted PostgreSQL;
- порядок, в котором production environment должен быть подготовлен перед первым deploy.

## 9. Asset And Metadata Strategy

Phase E должен закрепить production-ready поведение для:

- `manifest`
- icons
- metadata
- public cover assets
- SEO-relevant page descriptors

Основные public routes должны иметь:

- адекватные title/description;
- корректные icons;
- понятный metadata baseline для социальной и поисковой индексации там, где это применимо.

## 10. Risk Handling

### 10.1 Heavy feature routes

Некоторые части приложения inherently heavier, например:

- AR preview;
- premium visual catalog UI;
- recommendation UI с визуально насыщенными карточками.

Если такие маршруты сложнее довести до идеальных показателей, приоритет всё равно должен оставаться на основных public/demo routes, а не на вычищении каждой тяжёлой фичи до абсолютного минимума.

### 10.2 Deploy stability over vanity metrics

Нельзя ломать:

- auth;
- recommendations;
- PWA behavior;
- asset delivery;
- DB connectivity

ради выигрыша в несколько баллов `Lighthouse`.

### 10.3 Scope containment

Phase E должен оставаться focused optimization/deploy phase.

Если во время реализации возникает идея новой feature или крупного refactor-а, она должна быть вынесена за рамки этого этапа, если только напрямую не нужна для production stability или performance.

## 11. Testing And Verification Strategy

### 11.1 Functional verification

После performance/deploy изменений обязательно сохраняются:

- `lint`
- unit/integration tests
- production build
- smoke checks критических маршрутов

### 11.2 Performance verification

Нужно добавить или закрепить:

- Phase E verify command;
- checklist для route-level perf review;
- baseline/after comparison для ключевых маршрутов;
- manual или scripted `Lighthouse`-проверку в объёме, достаточном для демонстрации улучшений.

### 11.3 Deploy verification

Нужно проверить:

- production env completeness;
- auth configuration sanity;
- expected deploy commands;
- отсутствие локальных-only допущений;
- корректность загрузки assets после deploy.

## 12. Deliverables

На выходе Phase E ожидаются:

- production/performance spec и implementation plan;
- code changes для основных performance bottleneck-ов;
- обновлённый production/deploy documentation block;
- Phase E verification command;
- deploy checklist;
- `Lighthouse`/manual audit checklist или эквивалентный отчётный артефакт.

## 13. Definition of Done

Phase E считается завершённым, если:

- проведён audit ключевых маршрутов;
- внесены осмысленные route/render/asset optimizations;
- production build стабилен;
- production env contract задокументирован;
- Vercel deploy path описан и подготовлен;
- `verify:phase-e` покрывает финальную проверку этапа;
- есть понятный `Lighthouse`/quality checklist;
- приложение после оптимизаций не ломает реализованные возможности `Phase A-D`;
- результат выглядит как deploy-ready graduation project, а не как локальный prototype.

## 14. Recommended Implementation Order

Рекомендуемый порядок реализации:

1. зафиксировать audit и bottleneck list по priority routes;
2. оптимизировать render boundaries и heavy UI zones;
3. затем привести в порядок assets, metadata и font/image strategy;
4. после этого закрепить production config assumptions;
5. затем оформить Vercel deploy flow и checklist;
6. в конце прогнать final verification и зафиксировать итоговый quality baseline.

Такой порядок позволяет сначала убрать самые ощутимые bottleneck-и, потом стабилизировать production configuration и только после этого оформлять deploy как предсказуемый процесс.

## 15. Immediate Next Step

Следующий шаг после утверждения этой спецификации: подготовить implementation plan для `Phase E: performance optimization + Vercel deploy readiness`, разбив работу на audit, render optimization, asset optimization, production config hardening, deploy documentation и final verification.
