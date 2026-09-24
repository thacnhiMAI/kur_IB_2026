# Спецификация Phase B: AI Recommendations для «Умная библиотека»

## 1. Цель

Реализовать вторую фазу проекта `«Умная библиотека»`, в которой персональные рекомендации становятся по-настоящему пользовательскими, объяснимыми и устойчивыми к ошибкам внешнего AI.

Phase B должна:

- учитывать все доступные сигналы пользователя;
- автоматически обновлять рекомендации при изменении пользовательского поведения;
- всегда иметь быстрый fallback snapshot;
- использовать AI не как обязательную точку отказа, а как слой enrichment;
- показывать на странице рекомендаций и общий summary, и конкретные причины для каждой книги.

## 2. Зафиксированные решения

На этапе проектирования для `Phase B` согласованы следующие решения:

- приоритет продукта: `глубокая персонализация`, а не только красивое отображение;
- используются **все доступные сигналы**: `favorites`, `reading history`, `reviews`, `ratings`, `genre/author affinity`;
- рекомендации **автоматически пересчитываются** при появлении новых сигналов;
- fallback snapshot создаётся сразу и не блокирует UI;
- AI enrichment выполняется **внутри server flow**, но не должен задерживать возврат usable snapshot;
- recommendation UI должен иметь:
  - общий `summary` для страницы,
  - конкретный `reason` для каждой recommendation card.

## 3. Границы Phase B

### Входит в scope

- сбор и агрегация всех recommendation signals;
- fallback scoring engine;
- snapshot lifecycle для рекомендаций;
- AI provider abstraction для enrichment;
- auto-regenerate при новых user signals;
- UI `/recommendations` с summary, insight strip и reason cards;
- тестирование scoring, snapshot refresh и render flow.

### Не входит в scope

- AR / WebXR;
- voice search;
- PWA offline strategy;
- background queue infrastructure;
- push notifications;
- сложная асинхронная job-system orchestration.

## 4. Product Goals

Phase B должна сделать recommendations не "декоративной фичей", а видимой частью пользовательского опыта.

Пользователь должен видеть:

- что рекомендации действительно основаны на его профиле чтения;
- почему конкретная книга появилась в подборке;
- что система продолжает работать даже если внешний AI не настроен или временно недоступен.

## 5. Recommendation Architecture

Выбранная архитектура: **двухслойный recommendation engine**.

### Layer 1: Fallback Recommendation Engine

Этот слой:

- собирает сигналы пользователя;
- вычисляет affinity и ranking;
- создаёт usable `RecommendationSnapshot` сразу;
- формирует baseline `summary` и `reason` без участия внешнего AI.

Назначение слоя:

- быстрый отклик;
- стабильность UX;
- отсутствие пустого recommendations screen;
- независимость от quota и ошибок провайдера.

### Layer 2: AI Enrichment

Этот слой:

- использует тот же recommendation context;
- улучшает summary страницы;
- переписывает reasons в более выразительной форме;
- при необходимости может слегка улучшить порядок элементов;
- не должен ломать или удалять fallback snapshot.

Назначение слоя:

- сделать рекомендации более человечными;
- усилить AI-составляющую дипломного проекта;
- сохранить provider flexibility через `OpenAI` / `GigaChat`.

## 6. Signals Model

В recommendation engine используются все уже доступные сигналы приложения.

### 6.1 Favorites

`Favorites` считаются самым сильным позитивным сигналом.

Они используются для:

- определения любимых авторов;
- определения любимых жанров;
- приоритизации похожих книг;
- формирования явных explanation reasons.

### 6.2 Reading History

История чтения учитывается по типам событий:

- `FINISHED` — самый сильный сигнал;
- `INTERESTED` — средний сигнал;
- `VIEWED` — слабый сигнал.

Она используется для:

- affinity по завершённым книгам;
- выделения тематических кластеров;
- определения next-book recommendations.

### 6.3 Reviews and Ratings

Отзывы и оценки используются как сигнал качества предпочтения.

Положительные отзывы/оценки:

- усиливают похожие author/genre clusters;
- помогают строить explanations вида "потому что вы высоко оценили...".

Низкие оценки:

- могут снижать вес слишком похожих кандидатов;
- помогают избежать рекомендаций из нежелательных кластеров.

### 6.4 Global Book Quality

Сигналы книги на уровне каталога:

- `ratingAverage`
- `ratingsCount`

используются как tie-break и мягкий quality prior, но не должны перебивать пользовательские предпочтения.

## 7. Scoring Strategy

### 7.1 Candidate generation

Recommendation engine сначала отбирает candidate pool из книг каталога, которые:

- опубликованы в публичном каталоге;
- не были завершены пользователем;
- не должны быть исключены по правилам повторов;
- имеют достаточно данных для отображения в UI.

### 7.2 Exclusion rules

По умолчанию engine не рекомендует:

- книги с `FINISHED` event;
- книги, уже находящиеся в текущем favorite set, если цель — предлагать следующие книги;
- книги, уже сильно потреблённые пользователем и не дающие нового recommendation value.

### 7.3 Weighted scoring

Начальная модель должна поддерживать следующие группы весов:

- совпадение по любимому автору — очень высокий вес;
- совпадение по любимому жанру — высокий вес;
- similarity к завершённым книгам — высокий вес;
- similarity к `INTERESTED` книгам — средний вес;
- similarity к `VIEWED` книгам — низкий вес;
- positive review/rating affinity — высокий вес;
- negative rating affinity — отрицательный вес;
- global quality prior — низкий вес.

Точная численная калибровка допускается в implementation plan, но архитектурно важно следующее:

- авторские совпадения сильнее genre-only совпадений;
- завершённые книги значат больше, чем простые просмотры;
- явный пользовательский позитив сильнее community popularity;
- popularity не должна превращать recommendation engine в "топ популярных книг".

## 8. Explanation Model

Recommendations должны быть объяснимыми на двух уровнях.

### 8.1 Page summary

На верхнем уровне формируется общий `summary`, описывающий текущий reading profile пользователя.

Примеры смыслов:

- пользователь чаще выбирает design-книги и системное мышление;
- пользователь завершает научную фантастику и высоко оценивает книги с сильными авторами;
- рекомендации собраны из любимых авторов, завершённых книг и высоко оценённых тем.

### 8.2 Item reasons

Каждый recommendation item должен иметь конкретный `reason`.

Примеры смыслов:

- совпадает по любимому автору;
- близко к завершённой книге;
- соответствует жанрам из избранного;
- хорошо сочетается с книгами, которые пользователь оценил высоко.

Fallback engine обязан сам уметь генерировать usable reasons.  
AI enrichment может улучшать формулировку, но не должен выдумывать причины, которых нет в signal model.

## 9. Recommendation Snapshot Lifecycle

### 9.1 Snapshot strategy

Каждое обновление рекомендаций создаёт новый `RecommendationSnapshot`.

Это нужно для:

- отслеживания эволюции рекомендаций;
- отладки;
- восстановления последнего рабочего snapshot;
- демонстрации recommendation freshness.

### 9.2 Snapshot metadata

Для snapshot lifecycle Phase B предусматривает расширение метаданных, например:

- `triggerSource`
- `strategy`
- `status`
- `contextHash`

Где:

- `triggerSource` показывает, что инициировало пересчёт;
- `strategy` различает `fallback` и `ai-enriched`;
- `status` отражает lifecycle (`ready`, `enriching`, `failed`);
- `contextHash` помогает избегать лишних recompute при одинаковом наборе signals.

### 9.3 Read model

Страница `/recommendations` всегда читает **latest usable snapshot**.

Если AI enrichment провалился:

- latest fallback snapshot остаётся видимым;
- пользователь не должен видеть пустой экран.

## 10. Auto-Regenerate Flow

### 10.1 Trigger points

Auto-regenerate recommendations должно вызываться после следующих пользовательских действий:

- toggle favorite;
- submit/update review;
- record `INTERESTED` event;
- record `VIEWED` event при необходимости;
- record `FINISHED` event.

### 10.2 Flow

При новом сигнале:

1. сохраняется сам user signal;
2. вызывается orchestration function, например `refreshRecommendationSnapshotForUser(userId, trigger)`;
3. строится новый fallback snapshot;
4. UI сразу получает новый usable snapshot;
5. затем запускается AI enrichment в том же server flow, но без блокировки usable результата;
6. при успехе snapshot становится enriched, при неуспехе fallback остаётся действительным.

### 10.3 Architectural rule

Recommendation regeneration не должен быть размазан по action-файлам.

Нужен один orchestration entry-point, который:

- собирает signals;
- вызывает fallback engine;
- вызывает provider enrichment;
- отвечает за snapshot lifecycle;
- централизует error handling.

## 11. AI Provider Layer

### 11.1 Provider abstraction

AI enrichment всегда вызывается через единый интерфейс `AIProvider`.

Поддерживаемые провайдеры:

- `OpenAI`
- `GigaChat`
- `fallback`

### 11.2 Provider responsibility

Провайдер не должен единолично решать, какие книги рекомендовать.

Его роль в Phase B:

- улучшать summary;
- улучшать item reasons;
- при необходимости мягко refine порядок;
- не ломать deterministic fallback baseline.

### 11.3 Failure semantics

Если внешний AI:

- недоступен;
- не настроен;
- возвращает ошибку;
- исчерпал quota;

то fallback snapshot остаётся единственным источником истины для UI.

## 12. UI / UX Design

Страница `/recommendations` должна иметь три уровня подачи.

### 12.1 Recommendation hero

Верхний блок страницы содержит:

- title;
- summary;
- статус freshness;
- указание, что подборка основана на reading profile.

### 12.2 Insight strip

Над списком рекомендаций должен быть компактный слой insight metadata:

- любимые жанры;
- любимые авторы;
- завершённые книги;
- высоко оценённые темы.

Это нужно для объяснимости и защиты проекта: reviewer должен видеть, что рекомендации строятся на пользовательских сигналах.

### 12.3 Recommendation cards

Каждая карточка должна содержать:

- обложку;
- название;
- автора;
- reason;
- лёгкий signal badge;
- ссылку на detail page.

## 13. Error Handling

### 13.1 Snapshot fail-safe

Если fallback generation не удался:

- latest previous usable snapshot остаётся активным;
- UI не должен становиться пустым.

### 13.2 AI enrichment failure

Если enrichment не удался:

- snapshot не удаляется;
- status может быть `failed`;
- fallback summary и reasons остаются видимыми.

### 13.3 Signal-noise control

Phase B должна предусматривать защиту от лишних recompute:

- через `contextHash`;
- или через эквивалентную стратегию anti-churn.

## 14. Testing Strategy

### Unit tests

- signal aggregation;
- score weighting;
- exclusion rules;
- fallback reason generation;
- provider selection;
- snapshot lifecycle helpers.

### Integration tests

- favorite/review/reading event создаёт новый snapshot;
- latest snapshot читается страницей рекомендаций;
- AI failure не ломает fallback UX;
- summary и item reasons сохраняются в БД корректно.

### E2E

- пользователь создаёт новый signal -> recommendations обновляются;
- recommendations page показывает summary и reason cards;
- неавторизованный пользователь перенаправляется на sign-in;
- recommendations остаются usable без внешнего AI.

## 15. Definition of Done

Phase B считается завершённой, когда:

- recommendation engine использует все доступные user signals;
- новые user signals автоматически пересчитывают snapshot;
- fallback snapshot всегда создаётся и читается быстро;
- AI enrichment не блокирует usable UI;
- `/recommendations` показывает:
  - page summary,
  - insight strip,
  - item-specific reasons;
- provider abstraction работает для `OpenAI` и `GigaChat`;
- unit, integration и relevant e2e tests проходят.

## 16. Risks

- частые user interactions могут вызывать лишние recompute без anti-churn механизма;
- AI provider quotas и latency могут ухудшить enrichment flow;
- слишком сложный scoring может стать хрупким без тестов;
- если explanations не будут привязаны к signal model, рекомендации будут выглядеть недостоверно.

## 17. Immediate Next Step

Следующий шаг после утверждения этой спецификации: написать implementation plan для `Phase B: AI Recommendations`, ориентированный на:

- signal aggregation,
- fallback scoring engine,
- snapshot lifecycle,
- AI enrichment orchestration,
- recommendations UI refresh,
- auto-regenerate trigger integration.
