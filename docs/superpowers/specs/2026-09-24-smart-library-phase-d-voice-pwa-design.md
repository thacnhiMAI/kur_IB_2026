# Спецификация Phase D: Голосовой поиск (Voice Search) + PWA

## 1. Цель

Реализовать `Phase D` для проекта `«Умная библиотека»` как единый продуктовый этап, объединяющий:

- голосовой поиск на базе `Web Speech API`;
- `PWA`-режим с installability;
- offline support для ключевых пользовательских сценариев;
- понятные fallback-механизмы для неподдерживаемых устройств и браузеров.

Phase D должен не создавать отдельные параллельные подсистемы, а расширять уже существующий каталог и пользовательские страницы поверх текущего UI и data flow.

Главный принцип этапа: **voice является способом ввода в общий search state, а PWA расширяет web-приложение offline-aware возможностями без поломки основной online-модели**.

## 2. Зафиксированные решения

Для этого этапа согласованы следующие решения:

- реализация идёт **одновременно** по двум направлениям: `Voice + PWA`;
- offline scope включает:
  - `/catalog`
  - `/favorites`
  - `/recommendations`
  - страницы книг `/books/[slug]`, которые пользователь уже открывал ранее;
- voice search доступен на:
  - `catalog`
  - `favorites`
  - `recommendations`
- предпочтительный архитектурный подход: **shared search state + centralized service worker/cache strategy**;
- `Voice Search` не создаёт отдельного механизма фильтрации, а работает поверх существующего поискового состояния;
- `PWA` на этом этапе должна быть installable и offline-aware, но не обязана включать полный production push pipeline.

## 3. Product Scope

### Входит в scope Phase D

- shared search state для keyboard и voice input;
- microphone button и listening state;
- `Web Speech API` integration;
- fallback для unsupported voice environments;
- `manifest`;
- service worker registration;
- offline caching для `catalog`, `favorites`, `recommendations`;
- runtime caching для ранее просмотренных `/books/[slug]`;
- installable app behavior;
- offline status UI;
- архитектурная подготовка для push-notifications;
- unit/integration/E2E coverage для основных и fallback-сценариев.

### Не входит в scope Phase D

- полнофункциональный push notification delivery backend;
- offline support для admin routes;
- offline support для auth mutation flows;
- полноценная background sync система;
- голосовые команды навигации или действий вне поиска;
- сложная мультиязычная NLP-нормализация запроса поверх speech transcript.

## 4. Product Flow

### 4.1 Voice Search flow

Пользователь открывает `catalog`, `favorites` или `recommendations` и видит:

- стандартное текстовое поле поиска;
- кнопку микрофона;
- визуальный индикатор состояния voice input.

Когда `Web Speech API` доступен:

1. пользователь нажимает кнопку микрофона;
2. начинается listening state;
3. transcript поступает в общий search state;
4. тот же UI, который реагирует на текстовый ввод, немедленно фильтрует список.

Когда `Web Speech API` недоступен:

- текстовый поиск остаётся полностью рабочим;
- voice button не ломает UI и не создаёт пустого состояния;
- пользователю показывается понятный fallback.

### 4.2 PWA flow

Пользователь открывает приложение в браузере и получает:

- installable PWA behavior;
- сохранение ключевых страниц в cache;
- offline-aware UX.

В online-режиме:

- service worker подготавливает offline cache;
- приложение работает как обычный web flow.

В offline-режиме:

- пользователь может открыть уже закэшированные страницы:
  - `/catalog`
  - `/favorites`
  - `/recommendations`
  - ранее просмотренные `/books/[slug]`
- UI должен ясно показать, что отображаются сохранённые данные, а не live network response.

## 5. Architecture

Phase D должен быть разделён на несколько хорошо ограниченных модулей, чтобы не размазывать voice logic, offline state и service worker behavior по всему приложению.

### 5.1 `search-runtime`

Общий runtime для поискового состояния.

Ответственность:

- хранить текущий `query`;
- хранить `isListening`;
- хранить промежуточный transcript;
- хранить состояние ошибки или unsupported voice mode;
- предоставлять единый интерфейс для text input и voice input.

Требование:

voice search должен записывать данные в этот runtime, а не обходить его.

### 5.2 `voice-search`

Client-side wrapper вокруг `Web Speech API`.

Ответственность:

- detect support;
- start recognition;
- stop recognition;
- передавать transcript в `search-runtime`;
- корректно обрабатывать permission denial и runtime errors.

### 5.3 `search-ui`

Переиспользуемый UI-компонент поиска.

Используется на:

- `catalog`
- `favorites`
- `recommendations`

Ответственность:

- текстовое поле;
- microphone button;
- listening indicator;
- unsupported/error copy;
- синхронизация с `search-runtime`.

### 5.4 `pwa-core`

Ядро PWA-функциональности.

Ответственность:

- manifest setup;
- service worker registration;
- installability metadata;
- online/offline status hooks;
- подготовка базовой точки расширения под notification subscription в будущем.

### 5.5 `offline-cache`

Отдельная стратегия управления cache.

Ответственность:

- precache app shell;
- runtime cache для route-групп;
- policy выбора `cache-first`, `network-first` или `stale-while-revalidate`;
- разграничение offline-supported и non-supported routes.

### 5.6 `offline-feedback`

Presentation layer для offline awareness.

Ответственность:

- banner или status strip;
- сообщение, что данные могут быть неактуальными;
- fallback page/message для route, который не был ранее закэширован.

## 6. Scope By Route

### `catalog`

- text search;
- voice search;
- offline cache;
- offline readable UI.

### `favorites`

- text search;
- voice search;
- offline cache;
- offline readable UI для уже сохранённых данных.

### `recommendations`

- text search;
- voice search;
- offline cache;
- offline readable UI для последнего доступного snapshot/state.

### `books/[slug]`

- offline support только для ранее просмотренных страниц;
- если книга не открывалась ранее, route не обязан magically появляться offline.

### Out of offline scope

- `admin/*`
- auth mutation flows
- create/update actions
- import actions

## 7. Shared Search Strategy

Voice search не должен дублировать filtering logic для каждой страницы.

Правильная модель:

- каждая страница подключается к общему search component/runtime;
- source input может быть:
  - keyboard
  - pasted text
  - voice transcript
- downstream filtering использует один и тот же `query`.

Это снижает дублирование логики и упрощает тестирование.

## 8. Voice Search Behavior

### Supported mode

Если браузер поддерживает `Web Speech API`:

- кнопка микрофона активна;
- пользователь видит listening state;
- transcript попадает в input;
- список перефильтровывается тем же образом, что и при обычном вводе.

### Unsupported mode

Если `Web Speech API` отсутствует:

- text search остаётся доступным;
- microphone control не ломает layout;
- UI показывает, что voice search недоступен в текущем browser/device context.

### Error mode

Если speech recognition запускается с ошибкой или permission denied:

- listening state останавливается;
- текущий query не очищается;
- пользователь получает короткое объяснение, а не технический stack/error code.

## 9. PWA Strategy

PWA должна расширять текущее приложение, а не превращать его в отдельный проект.

### 9.1 Manifest requirements

Необходимо добавить:

- app name;
- short name;
- theme color;
- background color;
- icons;
- display mode, пригодный для installable experience.

### 9.2 Service worker responsibilities

Service worker должен:

- обслуживать app shell;
- кешировать ключевые route responses;
- обслуживать offline fallback для ранее сохранённых страниц;
- не вмешиваться в mutation routes, где offline replay ещё не спроектирован.

### 9.3 Caching model

### Precache

- базовый app shell;
- critical static assets;
- manifest и связанная оболочка.

### Runtime cache

- `/catalog`
- `/favorites`
- `/recommendations`
- `/books/[slug]` после первого открытия
- cover images из внутреннего asset layer

### Not cached for offline workflow

- admin flows;
- auth mutations;
- write actions;
- routes, где stale data может исказить критичный пользовательский сценарий.

## 10. Offline UX

Главное требование: пользователь должен понимать, в каком режиме находится приложение.

### Online mode

- приложение ведёт себя как обычное online web app;
- cache работает фоном;
- search UI остаётся стандартным.

### Offline mode with cached data

- route открывается;
- пользователь видит данные;
- присутствует offline indicator;
- copy объясняет, что данные загружены из cache и могут быть не самыми свежими.

### Offline mode without cached data

- route не должен ломаться молча;
- пользователь получает понятный fallback message или offline fallback page;
- система не имитирует наличие данных, которых нет.

## 11. Push Preparedness

На этом этапе требуется только архитектурная подготовка, а не полноценная доставка уведомлений.

Допустимые элементы scope:

- место в `pwa-core` для будущей subscription logic;
- заготовка клиентского entry point;
- documentation note о том, как push будет расширен в следующей фазе.

Не требуется:

- production-ready backend sending pipeline;
- vendor integration;
- реальная отправка notifications в этом этапе.

## 12. Error Handling

### Voice

- unsupported browser -> graceful disabled state;
- permission denied -> human-readable message;
- speech recognition runtime failure -> stop listening and preserve current query.

### PWA

- failed service worker registration -> приложение остаётся usable как обычный web app;
- cache miss offline -> понятный fallback вместо broken page;
- missing network -> offline indicator вместо misleading spinner.

### Shared Search

- transcript partial/final update не должен ломать текущий text input;
- empty transcript не должен сбрасывать valid query без причины.

## 13. Testing Strategy

### 13.1 Unit tests

Покрываются:

- shared search state;
- voice support detection;
- transcript-to-query update rules;
- online/offline state helpers;
- cache strategy helpers.

### 13.2 Integration tests

Покрываются:

- search UI на `catalog`;
- search UI на `favorites`;
- search UI на `recommendations`;
- offline status presentation;
- route-level fallback behavior при offline/cache hit и cache miss.

### 13.3 E2E tests

Сценарии:

- text search continues to work;
- voice button shows supported or fallback state without breaking the page;
- install/manifest artifacts are reachable;
- offline-supported routes remain accessible after being visited;
- viewed book page opens from cache after network loss simulation.

### Important note

Так как `Web Speech API` и service worker behavior отличаются между средами, часть глубоких проверок может потребовать controlled browser setup или manual validation. Но базовые user-visible flows и fallback behavior должны быть проверены автоматически.

## 14. Definition of Done

Phase D считается завершённым, если:

- существует shared search runtime для text + voice;
- `catalog`, `favorites`, `recommendations` используют единый search UI;
- voice search работает в поддерживаемых браузерах;
- unsupported voice mode обрабатывается без поломки UI;
- приложение installable как `PWA`;
- manifest и service worker подключены;
- offline работают:
  - `/catalog`
  - `/favorites`
  - `/recommendations`
  - ранее просмотренные `/books/[slug]`
- пользователь видит понятный offline status;
- подготовлены архитектурные точки расширения для push-notifications;
- есть unit/integration/E2E coverage для основных и fallback-сценариев.

## 15. Risks and Constraints

- `Web Speech API` поддерживается не всеми браузерами;
- voice recognition behavior может различаться между браузерами и языковыми настройками;
- offline cache может показывать устаревшие данные, поэтому offline indicator обязателен;
- агрессивное кеширование auth/admin flows нежелательно;
- service worker ошибки не должны ломать базовый web flow;
- push functionality нельзя обещать как fully shipped feature на этом этапе.

## 16. Recommended Implementation Approach

Рекомендуемый порядок реализации:

1. создать shared search runtime и voice wrapper;
2. внедрить unified search UI на `catalog`, `favorites`, `recommendations`;
3. затем добавить manifest и service worker registration;
4. после этого реализовать offline cache strategy для целевых route groups;
5. затем добавить offline feedback UI;
6. в конце закрыть verification и documentation.

Такой порядок позволяет сначала стабилизировать ввод и UX, затем наращивать offline behavior, не смешивая слишком много moving parts в одном шаге.

## 17. Immediate Next Step

Следующий шаг после утверждения этой спецификации: создать детальный implementation plan для `Phase D: Voice Search + PWA + offline cache + installability` с разбивкой на shared search runtime, voice wrapper, search UI integration, service worker, manifest, offline cache strategy и verification.
