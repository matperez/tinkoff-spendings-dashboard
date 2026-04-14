# Tinkoff spendings dashboard

Локальный дашборд для анализа выгрузки расходов и доходов из Тинькофф (CSV/Excel) в SQLite.

## Setup (venv)

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
pip install -r requirements.txt
```

## Импорт + базовый анализ

По умолчанию скрипт ищет файлы в `export/` и пишет базу в `data/spendings.sqlite`.

```bash
source .venv/bin/activate
python scripts/import_and_analyze.py
```

Опционально можно указать свои пути:

```bash
python scripts/import_and_analyze.py --data-dir export --db data/spendings.sqlite
```

## Веб-дашборд (Next.js)

### 1) Установка зависимостей

```bash
cd web
npm install
```

### 2) Путь к SQLite (локально)

Файл `web/.env.local` **не коммитится** (см. `.gitignore`). Создайте его вручную:

```bash
cd web
printf "SPENDINGS_DB_PATH=../data/spendings.sqlite\n" > .env.local
```

Если база лежит в другом месте — укажите абсолютный путь.

### 3) Запуск dev-сервера

```bash
cd web
npm run dev
```

Откройте в браузере:

- `http://localhost:3000/dashboard` (или порт, который напечатает Next.js, если `3000` занят)
- `http://localhost:3000/patterns`

### Примечания

- Исходные выгрузки кладите в `export/` (CSV/XLSX/XLS).
- База по умолчанию: `data/spendings.sqlite` (создаётся импортом).
- Если Next.js выберет другой порт (например `3001`), просто используйте URL из вывода `npm run dev`.

## Что хранится в базе

Таблица `operations` — строки операций (расходы/доходы) со ссылкой на исходный файл и номер строки.

