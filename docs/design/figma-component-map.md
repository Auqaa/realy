---
date: 2026-04-04
topic: figma-component-map
status: active
---

# Figma -> Code Map

Этот файл нужен, чтобы после новой ревизии в Figma было понятно, какие файлы менять в коде в первую очередь.

## Shared shell

| Figma component / screen | Основной код |
|---|---|
| `Shell / Left Rail` | `frontend/src/components/AdminWorkspaceShell.jsx` |
| `Shell / Top Context Bar` | `frontend/src/components/AdminWorkspaceShell.jsx` |
| `Nav / Section Tab` | `frontend/src/components/AdminSectionTabs.jsx` |
| `Admin / Home` | `frontend/src/pages/AdminHome.jsx` |
| `Admin / Routes` | `frontend/src/pages/AdminRoutes.jsx` |
| `Admin / Route Packs` | `frontend/src/pages/AdminRoutePacks.jsx` |

## Cards and lists

| Figma component / screen | Основной код |
|---|---|
| `Card / Quick Action` | `frontend/src/pages/AdminHome.jsx` |
| `Card / Recent Work` | `frontend/src/pages/AdminHome.jsx` |
| `Card / Summary Stat` | `frontend/src/components/AdminWorkspaceShell.jsx`, `frontend/src/pages/AdminHome.jsx`, `frontend/src/pages/GuideWorkspace.jsx` |
| `Card / Entity List Item` | `frontend/src/pages/AdminRoutes.jsx`, `frontend/src/pages/AdminRoutePacks.jsx`, `frontend/src/pages/GuideWorkspace.jsx` |
| `Status / Chip` | `frontend/src/pages/AdminHome.jsx`, `frontend/src/pages/AdminRoutePacks.jsx`, `frontend/src/pages/GuideWorkspace.jsx` |
| `Empty / Placeholder` | `frontend/src/pages/AdminHome.jsx`, `frontend/src/pages/GuideWorkspace.jsx` |

## Guide workspace

| Figma component / screen | Основной код |
|---|---|
| `Guide / Workspace` | `frontend/src/pages/GuideWorkspace.jsx` |
| `Guide / Access Denied` | `frontend/src/pages/GuideWorkspace.jsx` |
| `Guide / Variant Card` | `frontend/src/pages/GuideWorkspace.jsx` |
| `Guide / Stop Material Block` | `frontend/src/pages/GuideWorkspace.jsx` |
| `Guide / Summary Cards` | `frontend/src/pages/GuideWorkspace.jsx` |

## Public app surfaces

| Figma component / screen | Основной код |
|---|---|
| `Home / Hero` | `frontend/src/pages/Home.jsx` |
| `Home / Route List` | `frontend/src/components/RouteList.jsx` |
| `Home / Route Pack List` | `frontend/src/components/RoutePackList.jsx` |
| `Home / Route Pack Detail` | `frontend/src/components/RoutePackDetail.jsx` |
| `Home / QR Scanner` | `frontend/src/components/QRScanner.jsx` |
| `Home / Map` | `frontend/src/components/YandexMap.jsx` |

## Foundation layer

| Что изменилось в Figma | Где это трогать в коде |
|---|---|
| Global background | `frontend/src/index.css` |
| App shell navigation | `frontend/src/App.js` |
| Общие tailwind-паттерны и utility usage | `frontend/src/**/*.jsx` |
| Token reference | `docs/design/admin-figma-tokens.json` |

## Порядок переноса, если изменили макет

1. Проверить, что именно поменялось: `token`, `component`, `screen`, `behavior hint`.
2. Если изменились foundations, сначала обновить токены и общие стили.
3. Если изменился reusable component, сначала править shared file, потом конкретные страницы.
4. Только после этого править screen-specific layout.

## Если дизайнер меняет что-то большое

Если в Figma затронуто сразу несколько экранов, то безопасный порядок такой:

1. `AdminWorkspaceShell.jsx`
2. `AdminSectionTabs.jsx`
3. `AdminHome.jsx`
4. `AdminRoutes.jsx`
5. `AdminRoutePacks.jsx`
6. `GuideWorkspace.jsx`

Так меньше риск сделать визуальный drift между экранами.
