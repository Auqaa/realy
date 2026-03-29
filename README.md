# Рязанский квест

PWA-приложение для маршрутов по Рязани, QR-квестов, карты 2GIS, офлайн-сканов, лидерборда и магазина наград.

## Стек

- `backend/` — Node.js API с локальной JSON-БД
- `frontend/` — React + Tailwind
- `site/` + `local_server.py` — статический путь запуска

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

### Вариант 2. Статический запуск

```bash
copy .env.example .env
python local_server.py
```

Откройте `http://localhost:8000`.

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

Backend читает `.env` автоматически. `local_server.py` тоже читает корневой `.env`.

## Изображения

Файлы уже подключены в проект:

- ярлык приложения: `frontend/public/icons/yar.jpg`
- favicon: `frontend/public/favicon.ico`
- PWA-иконки: `frontend/public/icons/icon-192.png`, `frontend/public/icons/icon-512.png`, `frontend/public/icons/apple-touch-icon.png`
- hero-фон плашки на главной: `frontend/public/images/hero/00_ryazan.jpg`
- фон интерфейса: `frontend/src/assets/fon.jpg`

Если хотите заменить их после клонирования:

- замените `frontend/public/icons/yar.jpg` и пересоберите favicon/PWA-иконки
- замените `frontend/public/images/hero/00_ryazan.jpg` для hero-блока
- замените `frontend/src/assets/fon.jpg` для общего фонового изображения

## Данные и локальные файлы

- локальная БД: `backend/data/db.json`
- этот файл не нужно коммитить
- `backend/.env` и корневой `.env` тоже не коммитятся

## Админ-вход

- email: `admin@local.test`
- пароль: `admin123`

## Подготовка к GitHub

Перед push достаточно:

1. Проверить, что в git не попали `.env` и `backend/data/db.json`
2. Закоммитить код
3. Запушить репозиторий

Пример:

```bash
git status
git add .
git commit -m "Prepare project for GitHub"
git branch -M main
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```
