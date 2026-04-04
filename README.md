# Рязанский квест

PWA-приложение для маршрутов по Рязани, QR-квестов, карты 2GIS, офлайн-сканов, лидерборда и магазина наград.

## Стек

- `backend/` — Node.js API с локальной JSON-БД
- `frontend/` — React + Tailwind

## Быстрый запуск

### Вариант 1. Backend + frontend

1. Создайте env-файл:

```bash
copy .env.example .env
copy backend\.env.example backend\.env
```

2. Укажите ключ 2GIS:

- откройте `.env`
- задайте `TWOGIS_KEY=ВАШ_КЛЮЧ`

3. Запустите backend:

```bash
cd backend
npm install
npm start
```

4. Запустите frontend во втором терминале:

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

5. Откройте:

- `http://localhost:3000` — frontend
- `http://localhost:5000` — backend API

## Где менять ключ 2GIS

Главное место: корневой файл `.env`.

Минимально достаточно этой строки:

```env
TWOGIS_KEY=ВАШ_КЛЮЧ_2GIS
```

При необходимости можно задать отдельные ключи:

- `TWOGIS_MAP_KEY`
- `TWOGIS_ROUTING_KEY`
- `TWOGIS_GEOCODER_KEY`
- `TWOGIS_PLACES_KEY`

Backend читает `.env` автоматически.

## Изображения

Файлы уже подключены в проект:

- ярлык приложения: `frontend/public/icons/yar.jpg`
- favicon: `frontend/public/favicon.ico`
- PWA-иконки: `frontend/public/icons/icon-192.png`, `frontend/public/icons/icon-512.png`, `frontend/public/icons/apple-touch-icon.png`
- hero-фон плашки на главной: `frontend/public/images/hero/00_ryazan.jpg`
- фон интерфейса: `frontend/src/assets/fon.jpg`
- аудио для гида: `frontend/public/media/kremlin-guide.mp3`

Если хотите заменить их после клонирования:

- замените `frontend/public/icons/yar.jpg` и пересоберите favicon/PWA-иконки
- замените `frontend/public/images/hero/00_ryazan.jpg` для hero-блока
- замените `frontend/src/assets/fon.jpg` для общего фонового изображения
- замените `frontend/public/media/kremlin-guide.mp3` для demo-audio гида

## Данные и локальные файлы

- локальная БД: `backend/data/db.json`
- этот файл не нужно коммитить
- `backend/.env` и корневой `.env` тоже не коммитятся

## Figma handoff

Чтобы дизайнер мог менять интерфейс, а разработка потом шла без потерь, в репозиторий добавлен handoff-набор:

- `docs/design/figma-handoff.md` — как должен быть устроен Figma-файл
- `docs/design/admin-figma-tokens.json` — базовые токены для foundations/styles
- `docs/design/figma-component-map.md` — соответствие Figma-компонентов и файлов в коде
- `docs/design/figma-revision-template.md` — шаблон, который дизайнер может присылать с новой ревизией

Если дизайнер присылает обновленный макет, лучше опираться именно на эту структуру: `Foundations -> Components -> Screens -> Change Notes`.

## Админ-вход

- email: `admin@local.test`
- пароль: `admin123`

