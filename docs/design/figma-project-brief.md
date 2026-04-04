---
date: 2026-04-04
topic: figma-project-brief
status: active
---

# NaRyazan Figma Project Brief

Этот документ фиксирует структуру дизайн-файла и содержание ключевых экранов для проекта NaRyazan.

Практическое дополнение к brief:

- build checklist: `docs/design/figma-build-checklist.md`
- handoff rules: `docs/design/figma-handoff.md`
- component-to-code map: `docs/design/figma-component-map.md`
- token source: `docs/design/admin-figma-tokens.json`

## Цель

Собрать единый Figma-файл для admin и guide-сценариев, чтобы дальше можно было:

- синхронизировать UI с `frontend/src`
- вносить ревизии через components и tokens
- передавать изменения в код без повторного анализа экранов

## Структура файла

Создать один Figma-файл со страницами:

1. `00 Cover`
2. `01 Foundations`
3. `02 Components`
4. `03 Screens Desktop`
5. `04 Screens Mobile`
6. `05 Change Notes`

## Foundations

Использовать токены из [admin-figma-tokens.json](/c:/Users/And/Documents/bude/realy/docs/design/admin-figma-tokens.json).

Обязательные variable/style группы:

- Colors
- Text styles
- Radius
- Spacing
- Shadows

Ключевые значения:

- Desktop frame width: `1440`
- Mobile frame width: `390`
- Content max width: `1280`
- Base canvas: `#F8FAFC`
- Primary surface: `#FFFFFF`
- Accent sky 500: `#0EA5E9`
- Text primary: `#0F172A`

## Components

Обязательный набор:

- `Shell / Left Rail`
- `Shell / Top Context Bar`
- `Nav / Section Tab`
- `Card / Quick Action`
- `Card / Recent Work`
- `Card / Summary Stat`
- `Card / Entity List Item`
- `Status / Chip`
- `Form / Section`
- `Form / Field`
- `Button / Primary`
- `Button / Secondary`
- `Button / Quiet`
- `Empty / Placeholder`

Состояния:

- `default`
- `hover`
- `active`
- `disabled` где применимо
- `selected` для tabs и list items

## Desktop Screens

Минимальный набор экранов:

- `Admin / Home`
- `Admin / Routes`
- `Admin / Route Packs`
- `Guide / Workspace`
- `Guide / Access Denied`
- `Auth / Login`

### Admin / Home

Секции:

- top context bar с eyebrow, title, description, stats, quick actions
- grid quick actions 2x2
- recent work
- highlighted routes
- highlighted route packs

Визуальный характер:

- светлый canvas
- крупные карточки с радиусом `32`
- мягкие тени
- компактные sky-accent labels

### Admin / Routes

Секции:

- editor card маршрута
- fields: name, category, description
- route image uploader
- waypoint list editor
- QR-point subform
- live map preview
- routes table/list

Визуальный приоритет:

- форма слева, preview и list справа
- form sections как отдельные surface cards
- у waypoint cards своя иерархия и вложенные блоки

### Guide / Workspace

Секции:

- dark hero / summary header
- pack list
- selected pack briefing
- route variant selector
- map preview
- quick summary
- stop-by-stop material cards

Визуальный характер:

- hero на `surface.inverse`
- белые content cards поверх светлого canvas
- сильный контраст между обзором сценария и stop-by-stop деталями

### Guide / Access Denied

Секции:

- heading
- explanatory body copy
- primary CTA back to home

### Auth / Login

Сделать как простой входной экран в визуальном языке admin shell:

- centered auth card
- project title
- email/password fields
- primary action
- secondary helper text

## Mobile Screens

Минимальный набор:

- `Admin / Home / Mobile`
- `Admin / Routes / Mobile`
- `Admin / Route Packs / Mobile`
- `Guide / Workspace / Mobile`

Принципы:

- один поток контента
- shell сворачивается в compact top navigation
- cards сохраняют визуальный язык desktop
- map и long forms уходят ниже по иерархии

## Mapping To Code

Основные точки синхронизации:

- [AdminWorkspaceShell.jsx](/c:/Users/And/Documents/bude/realy/frontend/src/components/AdminWorkspaceShell.jsx)
- [AdminSectionTabs.jsx](/c:/Users/And/Documents/bude/realy/frontend/src/components/AdminSectionTabs.jsx)
- [AdminHome.jsx](/c:/Users/And/Documents/bude/realy/frontend/src/pages/AdminHome.jsx)
- [AdminRoutes.jsx](/c:/Users/And/Documents/bude/realy/frontend/src/pages/AdminRoutes.jsx)
- [AdminRoutePacks.jsx](/c:/Users/And/Documents/bude/realy/frontend/src/pages/AdminRoutePacks.jsx)
- [GuideWorkspace.jsx](/c:/Users/And/Documents/bude/realy/frontend/src/pages/GuideWorkspace.jsx)
- [Login.jsx](/c:/Users/And/Documents/bude/realy/frontend/src/pages/Login.jsx)
- [index.css](/c:/Users/And/Documents/bude/realy/frontend/src/index.css)

## Done Criteria

Дизайн считается готовым к handoff, если:

- оформлены foundations
- собраны shared components
- готовы desktop screens
- готовы mobile adaptations
- на `05 Change Notes` описано, что является restyle, layout change или new component
