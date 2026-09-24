# Спецификация Phase C: AR-превью (AR Preview) + WebXR

## 1. Цель

Реализовать `Phase C` для проекта `«Умная библиотека»` как полноценный `AR-preview` сценарий, доступный из страницы книги и совместимый с уже существующей архитектурой каталога, обложек и detail UI.

Phase C должен дать пользователю понятный путь:

- открыть `AR-preview` из страницы книги;
- получить `QR-code` для открытия на телефоне;
- увидеть книгу в `WebXR`, если устройство поддерживает `immersive-ar`;
- автоматически перейти в `3D viewer`, если `WebXR` недоступен;
- при слабом устройстве или отсутствии 3D-поддержки получить `2D enhanced preview`, а не пустой экран.

Главный принцип этапа: **один продуктовый сценарий, три уровня отображения (`WebXR -> 3D -> 2D`) без разрыва UX**.

## 2. Зафиксированные решения

Для этого этапа согласованы следующие продуктовые решения:

- реализация идёт **сразу полным контуром**, а не по урезанному demo path;
- `QR + WebXR + fallback viewer` входят в текущий scope;
- основной объект отображения: **книга как 3D-объект** с обложкой и корешком;
- для менее мощных устройств система автоматически переключается на **floating card / cover card**;
- основной entry point: **только страница детали книги** (`/books/[slug]`);
- AR открывается через **отдельный route**, а не встраивается целиком в detail page;
- данные для AR повторно используют текущий pipeline обложек и кэшированные assets, без отдельного ручного 3D-каталога.

## 3. Product Scope

### Входит в scope Phase C

- `AR entry` блок на странице книги;
- кнопка `Открыть AR`;
- `QR-code` для открытия мобильного AR route;
- route вида `/ar/books/[slug]`;
- определение capability устройства и браузера;
- `WebXR AR` mode;
- `3D viewer fallback`;
- `2D enhanced fallback`;
- переиспользование `coverImage`, `dominantColor`, `title`, `authors`, `description`;
- тесты на capability routing и fallback-поведение.

### Не входит в scope Phase C

- отдельная библиотека полноценных ручных 3D-моделей книг;
- marker-based AR со специальными печатными трекерами;
- multi-book AR scene;
- сохранение пользовательских AR-сцен;
- voice/PWA feature work;
- финальная mobile performance hardening под все классы устройств.

## 4. Product Flow

### 4.1 Entry point

Пользователь находится на странице `/books/[slug]` и видит отдельный блок `AR Preview`.

Блок содержит:

- CTA-кнопку `Открыть AR`;
- `QR-code` для открытия на телефоне;
- короткий текст о том, что лучший опыт доступен на совместимом мобильном устройстве;
- информацию о наличии fallback mode.

### 4.2 Route transition

После нажатия на кнопку или сканирования `QR-code` пользователь открывает route:

`/ar/books/[slug]`

Этот route является единой точкой входа для всех AR-related режимов.

### 4.3 Runtime decision

Route выполняет capability detection и выбирает один из трёх режимов:

1. `webxr`
2. `3d-fallback`
3. `2d-fallback`

Пользователь не выбирает режим вручную по умолчанию. Система сама отдаёт лучший совместимый опыт.

### 4.4 Output expectation

- если устройство поддерживает `WebXR immersive-ar`, пользователь видит `AR Preview`;
- если `WebXR` недоступен, но работает 3D renderer, пользователь видит `3D Preview`;
- если и это невозможно, пользователь получает `2D Preview` с тем же содержанием и объяснением текущего режима.

## 5. Route and Component Architecture

Phase C должен быть изолирован в отдельный набор модулей, чтобы не перегружать detail page и не смешивать SSR data loading с AR runtime logic.

### 5.1 `ar-entry`

Располагается в странице книги.

Ответственность:

- показать CTA;
- показать `QR-code`;
- вывести короткий explanatory text;
- собрать правильный URL для `/ar/books/[slug]`.

Ограничения:

- не содержит runtime `WebXR` logic;
- не инициализирует `three.js` или viewer;
- остаётся lightweight UI-компонентом.

### 5.2 `ar-route`

Route: `/ar/books/[slug]`

Ответственность:

- загрузить минимально необходимый payload книги;
- отрисовать общий shell страницы AR-preview;
- подключить capability detection;
- выбрать renderer mode;
- отрисовать presenter layer для всех режимов.

### 5.3 `ar-capability`

Отдельный модуль capability detection.

Ответственность:

- проверить наличие `navigator.xr`;
- проверить поддержку `immersive-ar`;
- определить наличие usable 3D/WebGL path;
- выбрать итоговый режим из списка:
  - `webxr`
  - `3d-fallback`
  - `2d-fallback`

Требование:

вся логика выбора режима должна жить централизованно здесь, чтобы UI не был размазан условными ветками.

### 5.4 `ar-renderer`

Слой renderer для визуализации книги.

Содержит два подрежима:

- `book-solid-renderer` — объёмная книга с передней обложкой, корешком и упрощённой задней стороной;
- `floating-card-renderer` — более лёгкий fallback с парящей обложкой/карточкой.

Правило:

- приоритетный renderer для совместимых устройств: `book-solid-renderer`;
- при слабом устройстве или ограничении renderer pipeline допустим `floating-card-renderer`.

### 5.5 `ar-presenter`

Презентационный слой поверх viewer.

Ответственность:

- показать `title`;
- показать `authors`;
- показать краткое описание;
- показать статус текущего режима:
  - `AR Preview`
  - `3D Preview`
  - `2D Preview`
- показать пояснение, почему был выбран fallback mode, если это не `WebXR`.

## 6. Data Contract

Для AR route используется отдельный компактный payload, не равный полной detail-модели.

Предлагаемый shape:

```ts
type ARBookPayload = {
  slug: string;
  title: string;
  subtitle?: string | null;
  authors: string[];
  description: string;
  coverImage?: string | null;
  dominantColor?: string | null;
};
```

### Data sourcing rules

- payload собирается из уже существующих book/detail данных;
- `coverImage` берётся из контролируемого cached asset layer;
- при отсутствии cover используется существующий project fallback cover;
- `dominantColor` повторно используется для spine/back styling и background mood.

### Important boundary

Renderer не должен самостоятельно запрашивать данные из базы.

Все данные должны приходить в renderer через `ARBookPayload`, чтобы:

- сохранить чистую границу между SSR/load и client runtime;
- упростить тестирование;
- не дублировать data access logic в клиентском слое.

## 7. Visual Rendering Strategy

### 7.1 Core visual metaphor

Основной объект — не абстрактная карточка, а именно **книга как физический объект**.

Это поддерживает тему проекта `«Умная библиотека»` и согласуется с уже сделанным premium catalog UI.

### 7.2 Texture strategy

Проект не должен зависеть от ручной подготовки отдельных 3D-моделей для каждой книги.

Вместо этого:

- передняя сторона = `coverImage`;
- корешок = оттенок/градиент на базе `dominantColor`;
- задняя сторона = упрощённый согласованный material;
- при fallback renderer может использоваться только лицевая обложка в виде floating card.

### 7.3 Capability-based rendering

- `webxr` предпочитает `book-solid-renderer`;
- если AR runtime доступен, но устройство показывает признаки ограничения производительности, допускается облегчённый renderer;
- `3d-fallback` может использовать `book-solid-renderer` или `floating-card-renderer` в зависимости от capability verdict;
- `2d-fallback` использует крупную обложку, градиентный фон, текст и метаданные без 3D canvas.

## 8. QR Flow

`QR-code` должен быть частью `AR entry` на странице книги.

### QR requirements

- код ведёт прямо на `/ar/books/[slug]`;
- route должен быть пригоден для открытия на мобильном устройстве без дополнительных параметров;
- QR используется как удобный bridge между desktop catalog experience и mobile AR experience.

### UX expectation

- desktop пользователь может открыть страницу книги и сразу отсканировать QR;
- mobile пользователь может открыть тот же route напрямую по ссылке;
- route не должен ломаться на desktop и обязан показывать fallback experience даже без мобильного AR.

## 9. Fallback Strategy

Главная цель fallback-модели — не допустить пустого экрана, технического тупика или ощущения "функция не работает".

### 9.1 Fallback ladder

Система использует строгую иерархию:

1. `WebXR AR`
2. `3D Preview`
3. `2D Preview`

### 9.2 Fallback behavior

- отсутствие `immersive-ar` не считается ошибкой продукта;
- отсутствие `WebGL` не считается фатальной ошибкой;
- каждый следующий fallback сохраняет тот же content payload и объясняет текущий режим.

### 9.3 User messaging

Если включён fallback, пользователь видит:

- текущий режим;
- короткое объяснение, почему активирован fallback;
- ненавязчивую рекомендацию попробовать совместимое мобильное устройство для полного AR-режима.

## 10. Error Handling

### 10.1 Book not found

Если книга по `slug` не найдена:

- route возвращает корректный `not found` сценарий;
- визуальный стиль должен оставаться согласованным с проектом.

### 10.2 Missing cover

Если у книги отсутствует обложка:

- используется project fallback cover;
- route всё равно остаётся рабочим;
- renderer не должен падать из-за отсутствия texture asset.

### 10.3 WebXR unavailable

Если `navigator.xr` отсутствует или `immersive-ar` недоступен:

- автоматически активируется `3d-fallback` либо `2d-fallback`.

### 10.4 Viewer initialization failure

Если 3D renderer не удалось инициализировать:

- route не должен оставлять broken canvas;
- UI должен перейти на `2D Preview`.

### 10.5 Camera permission denied

Если пользователь не выдал доступ к камере или AR session не может стартовать:

- нужно показать понятное объяснение;
- страница остаётся usable;
- fallback mode должен быть доступен без перезагрузки основного сценария.

### 10.6 Desktop open

Если AR route открыт на desktop:

- это допустимый сценарий;
- пользователь получает `3D Preview` или `2D Preview`, а не сообщение об ошибке.

## 11. Testing Strategy

### 11.1 Unit tests

Покрываются:

- capability detection;
- mapping из book detail data в `ARBookPayload`;
- выбор renderer mode;
- fallback reason generation.

### 11.2 Integration tests

Покрываются:

- рендер route `/ar/books/[slug]`;
- наличие `AR entry` на странице книги;
- корректная генерация target URL для AR route;
- корректная работа при отсутствии обложки.

### 11.3 E2E tests

Сценарии:

- открыть страницу книги;
- увидеть `AR entry`;
- перейти в AR route;
- убедиться, что хотя бы один preview mode отображается;
- проверить, что при отсутствии `WebXR` route остаётся usable;
- проверить fallback copy и status label.

### Important note for E2E

Так как `WebXR` availability в CI и локальном Playwright может отличаться, базовый E2E focus должен проверять:

- устойчивость route;
- наличие fallback path;
- корректный переход из detail page.

Отдельная глубокая проверка настоящего `immersive-ar` может требовать manual device validation.

## 12. Definition of Done

Phase C считается завершённым, если:

- на странице книги появился рабочий `AR entry` блок;
- реализован route `/ar/books/[slug]`;
- `QR-code` ведёт на этот route;
- capability detection выбирает корректный режим;
- реализована цепочка `WebXR -> 3D -> 2D`;
- для визуализации переиспользуются существующие cover assets;
- при отсутствии поддержки и при ошибках пользователь всё равно получает usable preview;
- добавлены unit/integration/E2E проверки для основного пути и fallback path.

## 13. Risks and Constraints

- `WebXR` поддерживается не всеми браузерами и устройствами;
- уровень поддержки `immersive-ar` особенно ограничен на desktop;
- производительность 3D renderer сильно зависит от устройства;
- route должен быть полезен даже без настоящего AR hardware path;
- нельзя делать архитектуру зависимой от ручного производства 3D assets;
- визуальное качество важно, но не должно ломать доступность fallback path.

## 14. Recommended Implementation Approach

Рекомендуемый engineering-подход для реализации:

1. сначала создать route и `ARBookPayload`;
2. затем сделать `AR entry` и `QR-code` интеграцию в detail page;
3. после этого подключить capability detection;
4. реализовать `2D` и `3D` fallback;
5. только затем добавить `WebXR` session path;
6. в конце закрыть тесты и polish.

Такой порядок уменьшает риск того, что команда застрянет на `WebXR`, не получив working product path.

## 15. Immediate Next Step

Следующий шаг после утверждения этой спецификации: создать детальный implementation plan для `Phase C: AR-preview + WebXR + QR + fallback viewer` с разбивкой на route, data contract, UI entry, renderer, capability detection и verification.
