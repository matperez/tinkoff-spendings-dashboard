# Spendings (SQLite)

Импорт банковских выгрузок (CSV/Excel) в SQLite и быстрый анализ.

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

## Что хранится в базе

Таблица `operations` — строки операций (расходы/доходы) со ссылкой на исходный файл и номер строки.

