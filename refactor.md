# План рефакторинга FretboardTrainer

## Цель документа

Этот документ фиксирует практический план рефакторинга `FretboardTrainer`.
Задача не в том, чтобы переписать приложение с нуля, а в том, чтобы снизить
архитектурную связанность, упростить развитие продукта и сохранить текущее
направление разработки.

Ключевая идея: рефакторинг должен идти поэтапно, без big-bang rewrite,
с сохранением рабочего приложения после каждого шага.

## Как я понимаю задумку приложения

По коду и внутренним документам приложение выглядит не как набор отдельных
тренажеров, а как единая guided-practice платформа для гитары и укулеле.

Основные продуктовые опоры:

- `Learn Notes` — самый простой вход в практику.
- `Study Melody`, `Practice`, `Perform` — лестница освоения одной мелодии.
- `Library` и `Editor` разделяют просмотр библиотеки и авторинг.
- аудио-движок и detection pipeline — это не вспомогательная мелочь, а ядро
  продукта.
- UI должен быть дружелюбным и направляющим, а не просто "панелью настроек".

Из этого следует важный вывод: архитектура должна быть собрана вокруг доменов
`workflow`, `session`, `melody`, `audio`, `ui`, `storage`, а не вокруг одного
глобального контроллера и нескольких больших util-файлов.

## Главные проблемы текущей архитектуры

### 1. Слишком крупные центральные файлы

Сейчас в кодовой базе есть несколько "сверхузлов", через которые проходит
слишком много разнородной логики:

- `src/controllers/session-controller.ts`
- `src/logic.ts`
- `src/ui-signals.ts`
- `src/state.ts`

Это главный источник архитектурного трения.

#### `src/controllers/session-controller.ts`

Фактически совмещает:

- composition root
- workflow-router
- регистрацию UI events
- синхронизацию layout
- orchestration для melody workspace
- wiring между storage, ui, logic, import/edit flows

Это делает даже небольшие UI-изменения потенциально рискованными.

#### `src/logic.ts`

Фактически совмещает:

- session lifecycle
- prompt progression
- audio runtime coordination
- performance transport logic
- detection reactions
- session result persistence triggers

Это уже не "logic", а монолитный runtime coordinator.

#### `src/ui-signals.ts`

Содержит одновременно:

- reactive state
- rendering policy
- workflow-specific visibility rules
- layout behavior
- direct DOM updates

То есть этот модуль давно вышел за рамки просто signal-layer.

#### `src/state.ts`

Смешивает в себе:

- DOM registry
- persisted settings
- runtime state
- melody state
- UI state
- audio telemetry
- session/performance state

Из-за этого почти любой модуль может получить доступ почти ко всему
приложению.

### 2. Правила видимости UI размазаны по нескольким местам

Сейчас workflow- и mode-aware visibility живет сразу в нескольких файлах:

- `src/training-workflows.ts`
- `src/workflow-ui-copy.ts`
- `src/session-tools-visibility.ts`
- `src/ui-signals.ts`
- `src/controllers/session-controller.ts`

Именно из-за этого легко появляются:

- orphan controls
- пустые контейнеры
- рассинхрон между workflow и layout
- баги вида "контрол скрыт, а связанный блок остался"

### 3. Слабые границы состояния

Глобальный `state` пока что скорее "bucket", чем набор domain slices.

Проблемы от этого:

- сложно понимать владельца поля
- сложно строить изолированные тесты
- сложно выносить модули без каскада зависимостей
- любая новая feature-логика склонна снова расти в ширину

### 4. Плоская структура `src/` уже не соответствует реальным доменам

Хотя логически домены уже существуют:

- audio
- session
- melody
- ui
- storage
- import/export
- workflows

физически значительная часть файлов все еще лежит плоско в `src/`, что
усложняет чтение архитектуры.

### 5. Runtime-слой стал сложнее, чем UI-слой

По backlog видно, что у проекта уже серьезная runtime-сложность:

- performance mic path
- monophonic/polyphonic detection
- timing and judging
- transport synchronization
- melody practice/performance split
- telemetry and calibration

Значит рефакторинг должен в первую очередь помогать runtime-эволюции, а не
только "наводить красоту" в папках.

## Принципы рефакторинга

1. Никакого полного переписывания приложения.
2. После каждого этапа приложение должно оставаться ship-ready.
3. Сначала разделяем ответственность, потом двигаем файлы.
4. Сначала уменьшаем центральные хабы, потом оптимизируем детали.
5. Не смешиваем архитектурный рефакторинг с продуктовым редизайном, если это
   не оговорено явно.
6. Любая новая feature по умолчанию не должна расти в `logic.ts`,
   `session-controller.ts`, `ui-signals.ts`, `state.ts`, если можно завести
   более узкий модуль.

## Целевая архитектура

Желаемое состояние — модульное TypeScript-приложение с явными границами,
но без смены стека.

### Целевые домены

- `audio`
- `session`
- `melody`
- `ui`
- `storage`
- `importers`
- `shared`

### Целевая модель владения

#### Composition root

Отвечает только за:

- инициализацию модулей
- wiring зависимостей
- запуск приложения

Не должен содержать feature-логику.

#### Controllers

Отвечают за:

- регистрацию UI-событий
- вызов orchestrators/services
- простую координацию пользовательских действий

#### Orchestrators / Executors

Отвечают за:

- многошаговые сценарии
- coordination между несколькими domain modules
- runtime flows

#### Domain modules

Отвечают за:

- бизнес-правила
- вычисления
- нормализацию и преобразования
- поведение без прямой привязки к DOM

#### State slices

Отвечают за:

- хранение состояния конкретного домена
- понятное ownership каждого поля

#### View policy modules

Отвечают за:

- видимость секций
- layout rules
- workflow-aware UI decisions

## Рекомендуемая стратегия доставки

Рефакторинг лучше проводить в четыре волны:

1. Зафиксировать архитектурные правила и границы.
2. Централизовать UI policy и разрезать state.
3. Уменьшить `session-controller.ts` и `logic.ts`.
4. Только потом перестраивать физическую структуру папок.

## Этап 0. Зафиксировать guardrails

### Цель

Сделать так, чтобы кодовая база перестала деградировать архитектурно во время
рефакторинга.

### Задачи

- Добавить этот документ в репозиторий.
- Добавить короткий документ с архитектурными правилами.
- Зафиксировать список крупных файлов, которые нельзя бесконтрольно
  увеличивать:
  - `src/controllers/session-controller.ts`
  - `src/logic.ts`
  - `src/ui-signals.ts`
  - `src/state.ts`
- Обновить quality gate так, чтобы стандартно гонялись:
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run typecheck`

### Почему это важно

Без guardrails новые фичи продолжат стекаться в уже перегруженные файлы,
и рефакторинг будет каждый раз откатываться назад.

### Definition of Done

- есть явное описание целевой архитектуры
- есть правила роста системы
- новый код больше не добавляется в хабы "по инерции"

## Этап 1. Централизовать workflow/layout policy

### Цель

Сделать одно место, которое отвечает на вопрос:

"Что должно быть видно в текущем workflow/mode/UI-state?"

### Почему это первый реальный этап

Это дает самый высокий эффект при низком риске: меньше layout-регрессий,
меньше orphan controls, меньше ad hoc правил по проекту.

### Что сделать

Создать модуль уровня:

- `src/ui/workflow-layout.ts`

И постепенно свести туда логику, которая сейчас распределена между:

- `src/training-workflows.ts`
- `src/workflow-ui-copy.ts`
- `src/session-tools-visibility.ts`
- `src/ui-signals.ts`
- `src/controllers/session-controller.ts`

### Что должен уметь новый слой

Он должен уметь на основе входных данных возвращать полную картину layout:

- показывать или скрывать melody setup
- показывать или скрывать playback controls
- показывать или скрывать layout controls
- показывать или скрывать session tools
- показывать или скрывать editor actions
- понимать зависимости между чекбоксами и подчиненными контролами
- централизованно решать, что видно в `Learn Notes`, `Study Melody`,
  `Practice`, `Perform`, `Library`, `Editor`

### Практический формат

Нужен единый layout/view model вида:

```ts
resolveWorkflowLayout({
  workflow,
  trainingMode,
  uiMode,
  hasSelectedMelody,
  layoutExpanded,
  showTabTimeline,
  showScroller,
})
```

### Ожидаемый результат

- UI visibility rules описаны декларативно
- `session-controller.ts` перестает вручную решать слишком много layout-задач
- проще писать targeted tests на UI policy

### Definition of Done

- layout policy централизована
- все workflow visibility rules покрыты тестами
- ручных разрозненных `if` в контроллерах стало заметно меньше

## Этап 2. Разделить `state.ts` на слайсы

### Цель

Разорвать глобальный `state` на доменные куски и отделить DOM от runtime state.

### Что сделать сначала

#### 2.1. Вынести DOM registry

Создать модуль вроде:

- `src/dom.ts`
- или `src/ui/dom.ts`

Туда должны уйти:

- `requireElementById`
- `requireQuerySelector`
- `dom` registry

Это уже само по себе уменьшит смешение "состояние + DOM".

#### 2.2. Вынести state slices

Создать отдельные слайсы:

- `audio-state.ts`
- `session-state.ts`
- `melody-state.ts`
- `ui-state.ts`
- `stats-state.ts`

### Пример ownership

#### `audio-state`

- input source
- audio device ids
- audio runtime handles
- detector settings
- telemetry counters
- calibration-related fields

#### `session-state`

- current prompt
- timer
- score
- stop/reset fields
- performance progress
- current detection/judging state

#### `melody-state`

- selected melody id
- transpose
- string shift
- study range
- visibility flags for tab/scroller
- zoom values
- melody runtime presentation state

#### `ui-state`

- `uiWorkflow`
- `uiMode`
- modal visibility
- expanded/collapsed panel state
- onboarding completion or active onboarding step if needed

#### `stats-state`

- stats snapshots
- summary data
- last session output state

### Важное ограничение

Сначала можно оставить агрегирующий экспорт, чтобы не ломать приложение
слишком широко. Но новые модули должны уже зависеть от slice-level interfaces,
а не от "всего state целиком".

### Definition of Done

- DOM больше не хранится вместе с mutable app state
- у каждого поля есть понятный владелец
- хотя бы часть контроллеров больше не зависит от полного глобального state

## Этап 3. Превратить `session-controller.ts` в composition root

### Цель

Оставить в `session-controller.ts` только wiring и регистрацию модулей.

### Почему это критично

Сейчас это главный узел UI-layer. Пока он не уменьшен, почти любая UI-фича
будет продолжать течь в него.

### На какие подмодули делить

#### 3.1. `workflow-controller`

Ответственность:

- переключение workflow
- синхронизация `trainingMode <-> uiWorkflow`
- workflow transitions
- workflow-aware routing

#### 3.2. `layout-controller`

Ответственность:

- panel visibility refresh
- collapse/expand behavior
- workspace mounting
- layout-specific sync

#### 3.3. `melody-workspace-controller`

Ответственность:

- melody toggles
- layout-dependent melody controls
- playback area controls
- sync для `Show TAB Timeline`, `Show Scroller`, zoom и связанных частей UI

#### 3.4. `session-actions-controller`

Ответственность:

- start/stop/hint/play-sound actions
- простая регистрация session-related кнопок

#### 3.5. `settings-sync-controller`

Ответственность:

- слушатели, которые делают только
  `read DOM -> normalize -> save -> refresh`

### Подход к выносу

- сначала выделять функции внутри файла
- потом переносить в соседние контроллеры
- потом инжектить зависимости явно
- потом оставлять в `session-controller.ts` только создание и wiring модулей

### Definition of Done

- `session-controller.ts` стал заметно меньше
- крупные UI-сценарии живут в отдельных контроллерах
- у extracted controllers есть прямые unit tests

## Этап 4. Разобрать `logic.ts` по runtime-доменам

### Цель

Сделать runtime engine модульным без изменения поведения.

### Почему это самый ценный глубокий рефакторинг

Именно `logic.ts` сейчас сильнее всего ограничивает развитие:

- performance mic improvements
- transport evolution
- onset/pitch split
- audio worklet migration
- runtime diagnostics

Все это будет намного проще, если session runtime и audio runtime перестанут
жить в одном большом файле.

### Предлагаемое разбиение

#### 4.1. Session lifecycle

Вынести в модули уровня:

- `src/session/session-lifecycle.ts`
- `src/session/session-stop.ts`
- `src/session/session-start.ts`

Что туда должно уйти:

- preflight
- activation
- teardown
- reset-on-stop
- session start/stop orchestration

#### 4.2. Prompt runtime

Вынести в:

- `src/session/prompt-runtime.ts`
- `src/session/prompt-advancement.ts`

Что туда должно уйти:

- initial prompt
- next prompt
- melody loop behavior
- practice/performance progression rules
- completion behavior

#### 4.3. Audio frame loop

Вынести в:

- `src/audio/runtime-loop.ts`
- `src/audio/frame-judging.ts`
- `src/audio/frame-routing.ts`

Что туда должно уйти:

- consumption of mic frames
- routing between calibration / detection / judging
- frame-driven side effects

Это особенно важно, если проект реально пойдет в сторону `AudioWorklet`.

#### 4.4. Performance runtime

Вынести в:

- `src/session/performance-runtime.ts`
- `src/session/performance-grading.ts`
- `src/session/performance-transport-runtime.ts`

Что туда должно уйти:

- event timing
- judged hits/misses
- transport-scoring separation
- practice vs perform behavioral split

#### 4.5. Persistence side effects

Вынести в отдельные service/adapters:

- save stats
- save analysis bundle
- save last session summary
- save star results

Чтобы runtime logic не была напрямую склеена с деталями storage.

### Definition of Done

- `logic.ts` перестал быть главным runtime-монолитом
- runtime modules тестируются изолированно
- transport/performance rules больше не перемешаны с unrelated side effects

## Этап 5. Привести storage к тем же domain slices

### Цель

Сделать слой хранения данных симметричным новой структуре state и runtime.

### Что сделать

- явно зафиксировать ownership существующих storage modules:
  - `storage-profiles`
  - `storage-melody-settings`
  - `storage-stats`
  - общий settings storage
- убрать ad hoc construction persistence payloads там, где это возможно
- ввести slice-specific serializers/deserializers
- упростить миграции схемы и загрузку профилей

### Почему это важно

Если storage останется "общим мешком", то даже после рефакторинга state и
controllers связанные изменения будут снова растекаться по проекту.

### Definition of Done

- storage APIs соответствуют доменным слайсам
- save/load contracts задокументированы и понятны
- миграции и schema evolution не размазаны по случайным местам

## Этап 6. Только потом перестроить структуру папок

### Цель

Физически выровнять файловую структуру по уже существующим границам.

### Почему это не надо делать раньше

Если начать с массового переноса файлов, получится много churn при малой
реальной пользе. Сначала нужны реальные границы, потом перемещение.

### Предлагаемая структура

- `src/audio/`
- `src/session/`
- `src/melody/`
- `src/ui/`
- `src/storage/`
- `src/importers/`
- `src/shared/`

### Что примерно куда переедет

#### `src/audio/`

- runtime
- detection
- input devices
- calibration
- telemetry

#### `src/session/`

- lifecycle
- prompt progression
- performance runtime
- summaries/results
- timeouts / pace / stop logic

#### `src/melody/`

- melody library
- melody editing
- timeline
- playback helpers
- fingering
- study range

#### `src/ui/`

- ui-signals
- workflow layout policy
- modal/view helpers
- rendering policies

#### `src/storage/`

- profiles
- stats
- melody settings
- storage schema

#### `src/importers/`

- MIDI
- MuseScore
- Guitar Pro
- ASCII tab

### Definition of Done

- структура папок отражает реальные домены
- новый contributor может по дереву понять ownership
- imports становятся более осмысленными

## Стратегия тестирования во время рефакторинга

### Обязательные проверки после каждого этапа

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run typecheck`

### Приоритеты тестов

#### 1. Layout policy tests

Нужны тесты вида:

- workflow -> visible sections
- ui mode -> visible controls
- melody layout toggles -> visible dependent controls

#### 2. Controller unit tests

Каждый новый extracted controller должен получать прямые tests, а не только
неявное покрытие через большие integration-style suites.

#### 3. Runtime tests

Нужны focused tests на:

- session lifecycle
- prompt progression
- practice loop behavior
- perform completion/grading behavior
- timing/performance transitions

#### 4. Smoke E2E

Хотя бы smoke coverage на:

- workflow switching
- melody workspace visibility
- editor/library separation
- session start/stop basics

## Рекомендуемая очередность внедрения

### Итерация 1

- Этап 0
- Этап 1

Причина:

- быстрый выигрыш по UI regressions
- почти нет риска для audio runtime

### Итерация 2

- Этап 2
- начало Этапа 3

Причина:

- появятся реальные границы для контроллеров

### Итерация 3

- завершение Этапа 3
- начало Этапа 4 с session lifecycle

Причина:

- wiring станет чище
- runtime extraction пойдет безопаснее

### Итерация 4

- завершение Этапа 4
- Этап 5

Причина:

- state/runtime/storage начнут совпадать по границам

### Итерация 5

- Этап 6

Причина:

- physical move должен быть последним большим churn-step

## Самые выгодные первые задачи

Если начинать не с абстрактного плана, а с ближайших tickets, я бы брал вот эти:

1. Создать `src/ui/workflow-layout.ts` и свести туда workflow visibility rules.
2. Вынести DOM registry из `src/state.ts` в отдельный модуль.
3. Создать `ui-state` slice и сначала перенести туда:
   - `uiWorkflow`
   - `uiMode`
   - expanded/collapsed panel state
4. Вынести workflow switching из `session-controller.ts` в отдельный controller.
5. Вынести melody workspace visibility/sync в отдельный controller.

Это хорошие стартовые задачи, потому что:

- они быстро уменьшают хаос
- они не трогают самый чувствительный audio pipeline
- они сразу улучшают читаемость архитектуры

## Риски

### 1. Hidden coupling

Часть зависимостей сейчас, вероятно, неявная и держится на глобальном state.

Как снижать риск:

- выносить маленькими шагами
- сначала покрывать тестами текущее поведение

### 2. UI drift во время централизации layout policy

Можно случайно поменять поведение интерфейса, пока правила собираются в одно
место.

Как снижать риск:

- сначала codify текущее поведение тестами
- потом переносить логику

### 3. Runtime regressions в `logic.ts`

Это наиболее чувствительная зона.

Как снижать риск:

- не совмещать runtime extraction и продуктовые изменения
- сначала сохранить поведение, потом менять архитектуру

### 4. Чрезмерный file churn

Слишком ранний перенос файлов ударит по скорости разработки.

Как снижать риск:

- переносить файлы только после появления реальных границ ответственности

## Критерии успеха

Рефакторинг можно считать успешным, если:

- ни один файл не остается безусловным хабом для нескольких несвязанных систем
- workflow/layout policy централизована и тестируема
- state поделен на понятные домены
- `session-controller.ts` стал в основном wiring-слоем
- `logic.ts` стал orchestration-слоем, а не runtime-монолитом
- структура папок отражает продуктовые домены
- новые фичи добавляются проще, чем сейчас

## Что этот план не включает

Этот план сознательно не включает:

- миграцию на другой UI framework
- полный rewrite audio engine
- смену storage stack
- радикальный redesign визуального слоя

## Короткий итог

Лучший путь для этого проекта выглядит так:

- сначала централизовать policy
- потом разделить state
- потом уменьшить hub-файлы
- потом изолировать runtime
- и только после этого двигать файлы по папкам

Это соответствует текущей стадии продукта, уважает уже проделанную работу и
уменьшает риск того, что рефакторинг затормозит развитие приложения.

## Execution Backlog

Ниже общий план преобразован в рабочий backlog. Формат специально сделан
практическим: что делать, в какой очередности, от чего зависит задача и по
какому признаку считать ее завершенной.

### Как использовать этот backlog

- В один PR брать только задачи из одного блока.
- Не смешивать UI-policy refactor и runtime refactor в одном PR.
- Любая задача, меняющая поведение layout, должна сопровождаться targeted
  tests.
- Любая задача, трогающая `logic.ts`, должна идти после фиксации baseline
  тестами для текущего поведения.

### Приоритеты

- `P0` уменьшает архитектурный риск и нужен до дальнейшего роста продукта.
- `P1` повышает модульность и ускоряет обычную feature-разработку.
- `P2` готовит глубокую runtime-декомпозицию.
- `P3` завершает выравнивание структуры проекта.

## Backlog 1. Baseline и Guardrails

### [ ] R0.1 Добавить стандартный quality gate

Priority: `P0`
Size: `S`

Цель:
- зафиксировать минимальный набор проверок, которые гоняются до и после
  каждого рефакторинг-шага

Задачи:
- проверить наличие `typecheck` в `package.json`
- добавить `npm run typecheck` в стандартный локальный checklist
- при необходимости добавить отдельную заметку в README или docs

Файлы:
- `package.json`
- `README.md`
- `refactor.md`

Definition of Done:
- стандартный набор проверок ясен и воспроизводим
- команда не спорит, что считать "зеленым состоянием"

### [ ] R0.2 Зафиксировать hot-spot policy

Priority: `P0`
Size: `S`

Цель:
- прекратить дальнейший бесконтрольный рост крупнейших файлов

Задачи:
- добавить короткую секцию в docs или в `refactor.md`
- явно указать, что новые feature-сценарии не должны расширять:
  - `src/controllers/session-controller.ts`
  - `src/logic.ts`
  - `src/ui-signals.ts`
  - `src/state.ts`

Файлы:
- `refactor.md`
- опционально `docs/architecture-boundaries.md`

Definition of Done:
- есть зафиксированное правило роста системы

## Backlog 2. Workflow/Layout Policy

### [ ] R1.1 Вынести workflow visibility rules в отдельный модуль

Priority: `P0`
Size: `M`
Depends on: `R0.1`

Цель:
- собрать разрозненные workflow/layout rules в одно место

Задачи:
- создать модуль вроде `src/ui/workflow-layout.ts`
- описать централизованный layout view model
- перенести туда логику из:
  - `src/training-workflows.ts`
  - `src/session-tools-visibility.ts`
  - части `src/workflow-ui-copy.ts`
  - части `src/ui-signals.ts`

Файлы:
- `src/training-workflows.ts`
- `src/session-tools-visibility.ts`
- `src/workflow-ui-copy.ts`
- `src/ui-signals.ts`
- `src/ui/workflow-layout.ts`

Definition of Done:
- один модуль определяет, какие секции и контролы видимы
- layout-решения не размазаны по нескольким контроллерам

### [ ] R1.2 Покрыть layout policy targeted tests

Priority: `P0`
Size: `M`
Depends on: `R1.1`

Цель:
- превратить visibility behavior в тестируемый контракт

Задачи:
- добавить tests на workflow combinations:
  - `learn-notes`
  - `study-melody`
  - `practice`
  - `perform`
  - `library`
  - `editor`
- отдельно покрыть зависимости вида:
  - toggle -> dependent control visibility
  - workflow -> section visibility
  - ui mode -> diagnostics visibility

Файлы:
- `src/workflow-ui-copy.test.ts`
- `src/session-tools-visibility.test.ts`
- новый test для `workflow-layout`

Definition of Done:
- ключевые layout rules описаны тестами
- будущие UI-regressions ловятся без ручной проверки

### [ ] R1.3 Свести layout refresh calls к одному API

Priority: `P0`
Size: `S`
Depends on: `R1.1`

Цель:
- убрать хаотичные прямые refresh-вызовы из разных частей UI

Задачи:
- определить единый public API для refresh layout visibility
- использовать его вместо scattered manual updates

Файлы:
- `src/ui-signals.ts`
- `src/controllers/session-controller.ts`

Definition of Done:
- layout refresh вызывается через понятный единый слой

## Backlog 3. State Slicing

### [ ] R2.1 Вынести DOM registry из `state.ts`

Priority: `P0`
Size: `M`
Depends on: `R1.2`

Цель:
- отделить DOM references от mutable app state

Задачи:
- создать `src/dom.ts` или `src/ui/dom.ts`
- перенести туда:
  - `requireElementById`
  - `requireQuerySelector`
  - объект `dom`
- обновить импорты в контроллерах и UI modules

Файлы:
- `src/state.ts`
- новый `src/dom.ts`
- модули, импортирующие `dom`

Definition of Done:
- DOM registry больше не живет в общем state-файле

### [ ] R2.2 Вынести `uiState` slice

Priority: `P0`
Size: `M`
Depends on: `R2.1`

Цель:
- первым делом отделить workflow/ui-mode/layout state

Задачи:
- создать `src/state/ui-state.ts`
- перенести туда:
  - `uiWorkflow`
  - `uiMode`
  - modal visibility
  - expanded/collapsed panel state

Файлы:
- `src/state.ts`
- `src/state/ui-state.ts`
- `src/ui-signals.ts`
- `src/controllers/session-controller.ts`

Definition of Done:
- UI-state имеет отдельный модуль и owner

### [ ] R2.3 Вынести `melodyState` slice

Priority: `P1`
Size: `M`
Depends on: `R2.2`

Цель:
- изолировать melody-specific state и уменьшить связность UI/logic

Задачи:
- создать `src/state/melody-state.ts`
- перенести туда:
  - selected melody fields
  - transpose
  - string shift
  - study range
  - tab/scroller visibility
  - zoom values

Файлы:
- `src/state.ts`
- `src/state/melody-state.ts`
- `src/controllers/session-controller.ts`
- `src/storage*.ts`

Definition of Done:
- melody-related state не смешан с audio/session state

### [ ] R2.4 Вынести `audioState` и `sessionState`

Priority: `P1`
Size: `L`
Depends on: `R2.3`

Цель:
- подготовить почву для безопасной декомпозиции `logic.ts`

Задачи:
- создать:
  - `src/state/audio-state.ts`
  - `src/state/session-state.ts`
- перенести audio runtime handles, detector settings, telemetry
- перенести session runtime, performance runtime, prompt-related state

Файлы:
- `src/state.ts`
- `src/logic.ts`
- `src/controllers/session-controller.ts`
- связанные модули runtime

Definition of Done:
- крупнейшие runtime state fields распределены по доменам

## Backlog 4. Session Controller Decomposition

### [ ] R3.1 Вынести workflow-controller

Priority: `P0`
Size: `M`
Depends on: `R1.3`, `R2.2`

Цель:
- убрать workflow routing из `session-controller.ts`

Задачи:
- создать `src/controllers/workflow-controller.ts`
- перенести туда:
  - workflow switching
  - sync `trainingMode <-> uiWorkflow`
  - default mode selection per workflow

Файлы:
- `src/controllers/session-controller.ts`
- `src/controllers/workflow-controller.ts`
- `src/training-workflows.ts`

Definition of Done:
- workflow orchestration не живет в session-controller напрямую

### [ ] R3.2 Вынести layout-controller

Priority: `P0`
Size: `M`
Depends on: `R3.1`

Цель:
- убрать panel/layout visibility wiring из `session-controller.ts`

Задачи:
- создать `src/controllers/layout-controller.ts`
- перенести туда:
  - panel collapse/expand wiring
  - layout visibility refresh orchestration
  - mounting of workflow-specific control groups

Файлы:
- `src/controllers/session-controller.ts`
- `src/controllers/layout-controller.ts`
- `src/ui-signals.ts`

Definition of Done:
- layout wiring живет отдельно и тестируется отдельно

### [ ] R3.3 Вынести melody-workspace-controller

Priority: `P1`
Size: `M`
Depends on: `R3.2`, `R2.3`

Цель:
- собрать melody workspace interactions в отдельный узел

Задачи:
- создать `src/controllers/melody-workspace-controller.ts`
- перенести туда:
  - toggles for note hint / tab timeline / scroller
  - zoom wiring
  - melody workspace control sync
  - related save/refresh operations

Файлы:
- `src/controllers/session-controller.ts`
- `src/controllers/melody-workspace-controller.ts`

Definition of Done:
- session-controller перестает напрямую владеть melody workspace wiring

### [ ] R3.4 Вынести session-actions-controller

Priority: `P1`
Size: `M`
Depends on: `R3.2`

Цель:
- отделить wiring пользовательских session actions от остального UI

Задачи:
- создать controller для:
  - start
  - stop
  - hint
  - play prompt sound
  - related button-state sync

Файлы:
- `src/controllers/session-controller.ts`
- `src/controllers/session-actions-controller.ts`

Definition of Done:
- основные пользовательские session actions живут вне session-controller

## Backlog 5. Runtime / `logic.ts` Decomposition

### [ ] R4.1 Вынести session lifecycle из `logic.ts`

Priority: `P1`
Size: `L`
Depends on: `R2.4`

Цель:
- отделить start/stop/reset lifecycle от прочего runtime

Задачи:
- создать модули вроде:
  - `src/session/session-start.ts`
  - `src/session/session-stop.ts`
  - `src/session/session-lifecycle.ts`
- перенести туда:
  - preflight
  - activation
  - teardown
  - reset flow

Файлы:
- `src/logic.ts`
- `src/session-start-preflight.ts`
- `src/session-reset-state.ts`
- новые session lifecycle files

Definition of Done:
- lifecycle больше не смешан со всеми остальными runtime responsibilities

### [ ] R4.2 Вынести prompt progression runtime

Priority: `P1`
Size: `L`
Depends on: `R4.1`

Цель:
- изолировать логику начального prompt, next prompt и completion behavior

Задачи:
- создать:
  - `src/session/prompt-runtime.ts`
  - `src/session/prompt-advancement.ts`
- перенести туда:
  - initial prompt generation
  - next prompt generation
  - loop/repeat behavior
  - practice/performance progression logic

Файлы:
- `src/logic.ts`
- `src/session-initial-prompt-plan.ts`
- `src/session-next-prompt-plan.ts`
- `src/session-next-prompt-executor.ts`

Definition of Done:
- prompt runtime можно читать отдельно от audio runtime

### [ ] R4.3 Вынести audio frame runtime

Priority: `P2`
Size: `L`
Depends on: `R4.1`

Цель:
- изолировать frame-driven audio/session loop

Задачи:
- создать:
  - `src/audio/runtime-loop.ts`
  - `src/audio/frame-routing.ts`
  - `src/audio/frame-judging.ts`
- убрать прямое смешение frame processing с unrelated session side effects

Файлы:
- `src/logic.ts`
- `src/audio-detection-handlers.ts`
- `src/audio-frame-processing.ts`

Definition of Done:
- audio frame loop читается как отдельный subsystem

### [ ] R4.4 Вынести performance runtime и grading

Priority: `P2`
Size: `L`
Depends on: `R4.2`, `R4.3`

Цель:
- отделить transport/judging logic от общего runtime

Задачи:
- создать:
  - `src/session/performance-runtime.ts`
  - `src/session/performance-grading.ts`
  - `src/session/performance-transport-runtime.ts`
- четко разделить:
  - transport progression
  - scoring/grading
  - practice vs perform behavior

Файлы:
- `src/logic.ts`
- `src/performance-*.ts`
- `src/session-*.ts`

Definition of Done:
- performance subsystem не размазан по logic.ts и мелким helper-файлам

## Backlog 6. Storage Alignment

### [ ] R5.1 Провести аудит persistence ownership

Priority: `P1`
Size: `M`
Depends on: `R2.4`

Цель:
- понять, какие domain slices что читают и пишут

Задачи:
- для каждого storage module описать:
  - owner
  - readers
  - writers
  - migration impact

Файлы:
- `src/storage.ts`
- `src/storage-profiles.ts`
- `src/storage-melody-settings.ts`
- `src/storage-stats.ts`

Definition of Done:
- storage ownership прозрачен

### [ ] R5.2 Выравнять storage APIs по domain slices

Priority: `P2`
Size: `M`
Depends on: `R5.1`, `R2.4`

Цель:
- сделать persistence API симметричным new state structure

Задачи:
- сократить ad hoc payload assembly
- ввести slice-oriented read/write helpers
- минимизировать knowledge leakage о внутренних полях state

Definition of Done:
- storage interfaces повторяют domain boundaries системы

## Backlog 7. Physical Restructure

### [ ] R6.1 Переместить UI-domain файлы по папкам

Priority: `P2`
Size: `M`
Depends on: `R3.4`

Цель:
- физически отразить уже проведенную декомпозицию UI

Задачи:
- перенести layout/workflow/ui modules в `src/ui/`
- обновить imports

Definition of Done:
- UI-domain читается по структуре дерева

### [ ] R6.2 Переместить melody-domain файлы по папкам

Priority: `P2`
Size: `M`
Depends on: `R3.3`

Цель:
- собрать melody library/editing/timeline рядом

Definition of Done:
- melody-domain имеет понятный физический контур

### [ ] R6.3 Переместить session/audio runtime по папкам

Priority: `P3`
Size: `L`
Depends on: `R4.4`, `R5.2`

Цель:
- завершить выравнивание структуры по доменам

Definition of Done:
- крупные runtime modules распределены по `src/audio/` и `src/session/`

## Sprint-Friendly Plan

### Спринт 1

- `R0.1`
- `R0.2`
- `R1.1`
- `R1.2`

Ожидаемый результат:
- централизованный layout policy
- тесты на основные workflow visibility rules

### Спринт 2

- `R1.3`
- `R2.1`
- `R2.2`
- `R3.1`

Ожидаемый результат:
- layout refresh более управляем
- DOM отделен от app state
- workflow handling вынесен из session-controller

### Спринт 3

- `R2.3`
- `R3.2`
- `R3.3`
- `R3.4`

Ожидаемый результат:
- `session-controller.ts` заметно уменьшается
- melody workspace и layout wiring выделены в отдельные модули

### Спринт 4

- `R2.4`
- `R4.1`
- `R4.2`

Ожидаемый результат:
- state slices готовы к runtime refactor
- session lifecycle и prompt progression больше не сидят в одном giant file

### Спринт 5

- `R4.3`
- `R4.4`
- `R5.1`

Ожидаемый результат:
- audio/performance runtime отделен
- ownership persistence задокументирован

### Спринт 6

- `R5.2`
- `R6.1`
- `R6.2`
- `R6.3`

Ожидаемый результат:
- storage и файловая структура выровнены под домены

## Что делать прямо сейчас

Если начинать немедленно, я рекомендую такую первую реальную цепочку PR:

1. PR 1: `R1.1` + `R1.2`
2. PR 2: `R2.1` + `R2.2`
3. PR 3: `R3.1`
4. PR 4: `R3.2` + `R3.3`

Это даст самый заметный выигрыш в управляемости без захода в самую хрупкую
часть audio runtime.

## Status Update (2026-03-09)

This plan predates a substantial controller extraction pass. The codebase has already moved further along than the original early-phase backlog implies.

### What is already true in the current tree

- `src/controllers/session-controller.ts` is no longer a single UI monolith; it already wires many extracted controllers.
- The following controllers are already present and in use in the composition root:
  - `workflow-layout-controller.ts`
  - `workflow-layout-controls-controller.ts`
  - `melody-import-controls-controller.ts`
  - `melody-editing-controls-controller.ts`
  - `melody-playback-controls-controller.ts`
  - `melody-library-controls-controller.ts`
  - `practice-preset-controls-controller.ts`
  - `practice-setup-controls-controller.ts`
  - `metronome-controls-controller.ts`
  - `instrument-display-controls-controller.ts`
  - `melody-setup-controls-controller.ts`
  - `melody-practice-controls-controller.ts`
  - `session-transport-controls-controller.ts`
  - `audio-input-controls-controller.ts`
  - `melody-tempo-controller.ts`
  - `session-bootstrap-controller.ts`
  - `practice-preset-ui-controller.ts`
  - `melody-demo-runtime-controller.ts`
- `index.tsx` is the real application entrypoint and already owns bootstrap ordering.
- `src/workflow-layout.ts` already exists and partially centralizes workflow/layout policy.

### Revised immediate priority

The safest next refactor step is not state slicing yet. The immediate priority is to keep shrinking `src/controllers/session-controller.ts` until it is a thinner composition root.

Recommended order from the current state:

1. Remove remaining workflow/layout bridge helpers from `session-controller.ts`.
2. Remove remaining summary/refresh bridge helpers from `session-controller.ts`.
3. Only after that, start `dom` extraction out of `state.ts`.
4. Leave `logic.ts` decomposition for a later phase after the UI composition root is stable again.


### Completed since this update

- P1 completed for MelodyPracticeMode: state.currentMelodyEventIndex++ was removed from generatePrompt() and is now advanced only from the success flow.
- P2 completed for melody modes: melody-practice.ts and melody-performance.ts no longer read BPM directly from dom; they use playback tempo from state.
- P3 completed for melody start validation: user-facing start errors for melody workflows now come from session-start-preflight.ts, and melody-practice.ts / melody-performance.ts no longer call 
otifyUserError(...) during prompt generation.
- New architectural boundary: melody modes are now closer to pure prompt producers; start gating lives at the session-start layer.
- P1 completed for metronome runtime: src/metronome.ts now uses lookahead scheduling against the audio clock instead of scheduling click starts directly from setTimeout. This keeps the public metronome API unchanged while making click timing resilient to main-thread jitter.

### Practical rule for the next steps

- Prefer small controller extractions over broad architectural moves.
- Do not combine `state.ts` slicing with `session-controller.ts` extraction in the same step.
- Keep using targeted tests plus smoke verification after each meaningful extraction.







## Status Update (2026-03-10)

Since the previous status update, the following additional behavior-preserving refactors and stabilizations landed:

- workflow restore is now persisted and restored explicitly through `uiWorkflow`, so `Practice`, `Library`, and `Editor` no longer collapse back to default melody workflows after reload
- `Learn Notes` string-button visibility now restores correctly across reload
- `MelodyPracticeMode` cleanup is further completed:
  - prompt index mutation removed from `generatePrompt()`
  - BPM is no longer read directly from the DOM
  - start validation moved into preflight
  - `currentMelodyEventFoundNotes.clear()` no longer lives in prompt generation
- `Study Melody` repeated-note detection was hardened so identical adjacent notes require a fresh post-silence attack instead of passing on sustain
- metronome runtime refactor is effectively complete for the current phase:
  - lookahead audio-clock scheduling
  - cached click buffers
  - visual pulse aligned to scheduled beat timing

Practical implication:

1. The workflow/UI state layer is more stable than it was on 2026-03-09.
2. The MelodyPracticeMode cleanup called out in this document as a near-term target is now substantially complete.
3. The highest-value next step remains shrinking `src/controllers/session-controller.ts` further rather than starting a broad `state.ts` or `logic.ts` rewrite.


## Status Update (2026-03-11)

Since the 2026-03-10 update, the refactor moved further from broad controller extraction into seam cleanup inside and around `src/controllers/session-controller.ts`.

### What is now true in the current tree

- `src/controllers/session-controller.ts` is down to roughly `1279` lines and is increasingly acting as a composition root rather than a mixed behavior/controller file.
- The following additional bridge/controller seams are now present and in use:
  - `melody-selection-controller.ts`
  - `melody-timeline-ui-controller.ts`
  - `selected-melody-context-controller.ts`
  - `melody-import-io-controller.ts`
  - `melody-import-workspace-controller.ts`
  - `interaction-guards-controller.ts`
  - `metronome-bridge-controller.ts`
  - `melody-timeline-editing-bridge-controller.ts`
  - `melody-event-editor-bridge-controller.ts`
  - `melody-practice-settings-bridge-controller.ts`
  - `metronome-runtime-bridge-controller.ts`
  - `curriculum-preset-bridge-controller.ts`
  - `melody-import-editor-bridge-controller.ts`
  - `melody-library-actions-bridge-controller.ts`
  - `session-start-controller.ts`
- Local thin-wrapper helpers around selected melody lookup, metronome runtime sync, timeline editing reset/sync, melody demo transport calls, and workflow facade calls have been substantially removed from `session-controller.ts`.
- `workflow-controller.ts` now acts as a more complete facade for session-layer workflow usage, including workspace mounting and session-tools visibility.
- Import flows are now more layered:
  - `melody-import-controls-controller.ts` talks to `melody-import-workspace-controller.ts` for open/close flows
  - preview/editor draft access is funneled through `melody-import-editor-bridge-controller.ts`
  - library/import save actions are funneled through `melody-library-actions-bridge-controller.ts`
- Startup/session entry points are thinner:
  - `startSessionFromUi` now lives in `session-start-controller.ts`
  - `registerSessionControls()` is now delegated through `session-bootstrap-controller.ts`

### Revised immediate priority from the current state

The next refactor step should not be a broad rewrite of `state.ts` or `logic.ts`.

Recommended order now:

1. Finish the upper `event-editor / import-preview / import-workspace` seam only if there is still a behavior-preserving extraction with clear value.
2. After that, stop and re-evaluate whether `session-controller.ts` still contains cheap wins, or whether it is already "thin enough" for the current phase.
3. Only then choose the next major hotspot, most likely:
   - `src/ui-signals.ts`, or
   - targeted runtime decomposition around `src/logic.ts` prerequisites, or
   - DOM extraction from `src/state.ts` if it can be done without coupling it to another large refactor.

### Practical implication

- The original backlog items under "Session Controller Decomposition" are partially complete in practice, even if the checklist above still reads as if they were mostly pending.
- The cheapest remaining work is no longer "remove another wrapper"; it is "decide whether another extraction still improves boundaries enough to justify added surface area".
- The document's original ordering still largely holds, but the current tree is already deeper into R3-style decomposition than the unchecked tasks suggest.

## Status Update (2026-03-11, later)

Since the previous 2026-03-11 update, the center of gravity moved again.

### What is now true in the current tree

- src/controllers/session-controller.ts is now roughly 1131 lines and is functioning primarily as a composition root.
- src/ui-signals.ts is now roughly 409 lines after view/sync/binding extraction and is much closer to a thin signal hub.
- The next major hotspot has clearly become src/logic.ts, and that file has already started to decompose along runtime seams.
- Additional runtime modules now exist and are wired in practice:
  - performance-transport-runtime-controller.ts
  - performance-timeline-feedback-controller.ts
  - performance-mic-telemetry-controller.ts
  - mic-monophonic-attack-tracking-controller.ts
  - mic-performance-runtime-status-controller.ts
  - session-prompt-runtime-controller.ts
  - performance-adaptive-runtime-controller.ts
  - monophonic-audio-frame-controller.ts
  - audio-frame-runtime-controller.ts
- src/logic.ts is down to roughly 1373 lines after moving several performance/mic/session runtime clusters out.

### What changed architecturally

- Performance transport clock / preroll / active-event runtime sync no longer lives inline in logic.ts.
- Performance timeline feedback mutations (success, missed, wrong, timing buckets) are now isolated from prompt orchestration.
- Performance mic telemetry and onset-gate bookkeeping are now isolated from the monophonic detection loop.
- Mic monophonic attack tracking and repeated-prompt fresh-attack guarding are now isolated from the larger audio-processing path.
- Mic readiness / detector-status runtime refresh is now behind its own seam instead of being maintained as ad hoc helper logic.
- Session goal progress, initial timeline preview, and prompt-audio runtime application are now isolated from the main prompt loop.
- Performance adaptive mic-hold calibration and timing-bias runtime updates are now isolated from the remaining logic.ts helper layer.
- The non-calibration monophonic audio-frame branch is now isolated from processAudio() behind its own runtime controller.
- processAudio() frame preflight/dispatch orchestration is now isolated behind a dedicated runtime controller instead of living inline in logic.ts.

### Revised immediate priority from the current state

The best next refactor steps are now inside src/logic.ts, not session-controller.ts.

Recommended order now:

1. Continue extracting runtime-only mic/performance clusters from logic.ts while preserving the existing audio loop behavior.
2. The next best candidates are startup/session-reset glue still coupled to runtime state resets and the remaining session start/stop orchestration in logic.ts.
3. Only re-evaluate state.ts slicing after the remaining high-density runtime glue in logic.ts has been reduced further.

### Practical implication

- The application is now past the earlier "thin session controller" phase and into a targeted runtime-decomposition phase.
- The cheapest remaining wins are no longer in UI composition; they are in isolating mic/performance runtime mutations from the main audio loop and remaining session runtime orchestration glue.
- logic.ts still remains the largest hotspot, but it is now shrinking through behavior-preserving seams instead of broad rewrites.
