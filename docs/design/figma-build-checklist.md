---
date: 2026-04-04
topic: figma-build-checklist
status: active
---

# NaRyazan Figma Build Checklist

Этот документ превращает `docs/design/figma-project-brief.md` в пошаговый checklist, по которому можно собрать и проверить Figma-файл без повторного чтения всего brief.

## 0. Перед стартом

- Использовать токены из `docs/design/admin-figma-tokens.json`.
- Держать открытыми code references из `docs/design/figma-component-map.md`.
- Собрать один файл со страницами:
  - `00 Cover`
  - `01 Foundations`
  - `02 Components`
  - `03 Screens Desktop`
  - `04 Screens Mobile`
  - `05 Change Notes`

## 1. `00 Cover`

- Название файла: `NaRyazan / Admin + Guide`.
- На cover указать:
  - scope: `admin + guide`
  - source tokens: `admin-figma-tokens.json`
  - last update date
  - owner / editor если нужно

Готово, если:

- cover сразу объясняет, что это единый source-of-truth файл для handoff в `frontend/src`.

## 2. `01 Foundations`

### Variable / style groups

- `Colors`
- `Text styles`
- `Radius`
- `Spacing`
- `Shadows`

### Проверить ключевые значения

- Desktop frame width: `1440`
- Mobile frame width: `390`
- Content max width: `1280`
- Base canvas: `#F8FAFC`
- Primary surface: `#FFFFFF`
- Accent sky 500: `#0EA5E9`
- Text primary: `#0F172A`

### Быстрый QA

- Все повторяющиеся цвета оформлены как variables/styles, а не локально.
- Радиусы `16 / 20 / 24 / 32 / pill` заведены как явные tokens.
- Основные shadows совпадают с `soft / card / hero`.
- Typography покрывает минимум:
  - `display.lg`
  - `display.md`
  - `heading.sm`
  - `title`
  - `body`
  - `body.strong`
  - `label.caps`

## 3. `02 Components`

### Обязательный набор

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

### Обязательные состояния

- `default`
- `hover`
- `active`
- `disabled` где применимо
- `selected` для tabs и list items

### Component QA

- Повторяемые блоки сделаны как components/variants, а не нарисованы вручную.
- Для tabs, chips и list items variant names совпадают с реальными состояниями.
- Shell-компоненты готовы к desktop и compact/mobile адаптации.
- Внутри компонентов используется Auto Layout там, где блок реально растягивается в UI.

## 4. `03 Screens Desktop`

### `Admin / Home`

Проверить наличие:

- top context bar с eyebrow, title, description, stats, quick actions
- quick actions grid `2x2`
- recent work
- highlighted routes
- highlighted route packs

Визуальный QA:

- canvas светлый
- большие cards c radius `32`
- мягкие тени
- компактные sky-accent labels

Code sync:

- `frontend/src/pages/AdminHome.jsx`
- `frontend/src/components/AdminWorkspaceShell.jsx`

### `Admin / Routes`

Проверить наличие:

- editor card маршрута
- fields: name, category, description
- route image uploader
- waypoint list editor
- QR-point subform
- live map preview
- routes table/list

Layout QA:

- форма слева
- preview и list справа
- form sections разложены на отдельные surface cards

Code sync:

- `frontend/src/pages/AdminRoutes.jsx`

### `Admin / Route Packs`

Проверить наличие:

- pack editor surface
- list/table существующих packs
- pack route composition blocks
- status / readiness cues

Code sync:

- `frontend/src/pages/AdminRoutePacks.jsx`

### `Guide / Workspace`

Проверить наличие:

- dark hero / summary header
- pack list
- selected pack briefing
- route variant selector
- map preview
- quick summary
- stop-by-stop material cards

Visual QA:

- hero на `surface.inverse`
- content cards белые на светлом canvas
- обзор сценария и detail-блоки контрастно разделены

Code sync:

- `frontend/src/pages/GuideWorkspace.jsx`

### `Guide / Access Denied`

Проверить наличие:

- heading
- explanatory body copy
- primary CTA back to home

Code sync:

- `frontend/src/pages/GuideWorkspace.jsx`

### `Auth / Login`

Проверить наличие:

- centered auth card
- project title
- email/password fields
- primary action
- secondary helper text

Code sync:

- `frontend/src/pages/Login.jsx`

## 5. `04 Screens Mobile`

### Обязательные mobile frames

- `Admin / Home / Mobile`
- `Admin / Routes / Mobile`
- `Admin / Route Packs / Mobile`
- `Guide / Workspace / Mobile`

### Mobile QA

- один поток контента без desktop side-by-side layout
- shell переходит в compact top navigation
- cards сохраняют desktop visual language
- map и длинные формы уходят ниже по иерархии
- spacing не расползается относительно foundations

## 6. `05 Change Notes`

На странице должны быть явно перечислены:

- что является `restyle`
- что является `layout change`
- что является `new component`
- какие screens и components затронуты
- что менялось отдельно на mobile

Готово, если:

- инженер может открыть change notes и сразу понять, в каком порядке переносить изменения в код.

## 7. Pre-Handoff Review

Перед передачей в код проверить:

- foundations заведены и консистентны
- shared components покрывают повторяющийся UI
- desktop screens собраны
- mobile adaptations собраны
- change notes заполнены
- screen names совпадают с brief
- component names совпадают с `docs/design/figma-component-map.md`

## 8. Handoff Packet

Передавать вместе:

- ссылку на Figma file или конкретные frames
- `docs/design/figma-revision-template.md`
- `docs/design/figma-component-map.md`
- краткий список изменённых screens/components

Если изменилась структура, а не только визуал, это должно быть явно отмечено в handoff как `layout change`.
