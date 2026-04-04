---
date: 2026-04-04
topic: figma-handoff
status: active
---

# Figma Handoff для NaRyazan

Этот документ нужен, чтобы дизайнер мог спокойно менять макеты в Figma, а реализация в коде потом шла без догадок и лишних пересборок.

## Что считаем source of truth

- Figma отвечает за визуальный слой: layout, spacing, typography, colors, component states, asset placement.
- Репозиторий отвечает за поведение: router, data, permissions, API, validation, loading/error states.
- Если в Figma меняется структура экрана, дизайнер должен менять не только frame, но и связанные компоненты в `02 Components`.

## Как собрать файл в Figma

Создай один Figma-файл с такими страницами:

1. `00 Cover`
2. `01 Foundations`
3. `02 Components`
4. `03 Screens Desktop`
5. `04 Screens Mobile`
6. `05 Change Notes`

## Что должно быть на каждой странице

### `01 Foundations`

Обязательно завести Figma Variables / Styles для:

- Colors
- Text styles
- Radius
- Spacing
- Shadows

Базовые токены лежат в [admin-figma-tokens.json](/c:/Users/And/Documents/bude/realy/docs/design/admin-figma-tokens.json).

### `02 Components`

Обязательные компоненты:

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

Для каждого компонента нужны варианты:

- `default`
- `hover`
- `active`
- `disabled` если применимо
- `selected` для list items и tabs

### `03 Screens Desktop`

Минимальный набор экранов:

- `Admin / Home`
- `Admin / Routes`
- `Admin / Route Packs`
- `Guide / Workspace`
- `Guide / Access Denied`
- `Auth / Login`

### `04 Screens Mobile`

Минимум:

- `Admin / Home / Mobile`
- `Admin / Routes / Mobile`
- `Admin / Route Packs / Mobile`
- `Guide / Workspace / Mobile`

### `05 Change Notes`

На этой странице дизайнер пишет:

- что именно изменилось
- какие компоненты были затронуты
- что новое, а что только restyle
- есть ли новые состояния

## Правила для дизайнера

- Использовать Auto Layout везде, где блок реально растягивается в интерфейсе.
- Не рисовать “одноразовые” кнопки и карточки руками, если они повторяются.
- Любое повторяемое UI-решение сначала обновлять как component, потом как screen.
- Не переименовывать существующие screen/component names без причины.
- Если меняется только визуал, структура имен должна остаться стабильной.
- Если меняется поведение, добавлять note прямо на макете.
- Для desktop использовать frame width `1440`, для mobile `390`.
- Для shell и длинных экранов фиксировать key sections, а не только “красивый первый экран”.

## Правила handoff ко мне

Когда дизайнер пришлет обновленный файл, для точной реализации мне нужны:

1. Ссылка на Figma file или конкретный frame.
2. Названия измененных экранов.
3. Названия измененных компонентов.
4. Отметка: это `restyle`, `layout change` или `behavior hint`.
5. Если есть новый asset, его export name.

## Как маппить дизайн в код

Текущие главные точки входа:

- `frontend/src/components/AdminWorkspaceShell.jsx`
- `frontend/src/pages/AdminHome.jsx`
- `frontend/src/pages/AdminRoutes.jsx`
- `frontend/src/pages/AdminRoutePacks.jsx`
- `frontend/src/pages/GuideWorkspace.jsx`
- `frontend/src/App.js`
- `frontend/src/index.css`

Если дизайнер меняет shell, quick actions, cards или section tabs, сначала обновляется shared слой, а уже потом конкретные страницы.

## Что ускоряет точную реализацию

Лучший handoff выглядит так:

- дизайнер меняет token/style
- дизайнер обновляет component
- дизайнер обновляет screen
- дизайнер пишет краткую note на странице `05 Change Notes`

Тогда я могу переносить изменения сверху вниз: `tokens -> components -> screens -> responsive`.

## Что не стоит делать в Figma

- Не смешивать desktop и mobile в одном frame set без подписей.
- Не делать hidden changes без notes.
- Не рисовать только идеальное состояние без loading/empty/selected, если экран ими пользуется.
- Не оставлять цвета и текст без styles, если они повторяются.

## Definition of Done для дизайн-итерации

Макет считается готовым к переносу, если:

- обновлены foundations или подтверждено, что они не менялись
- обновлены связанные components
- обновлены desktop/mobile screens
- на `05 Change Notes` есть список изменений
- у новых состояний есть явное название
