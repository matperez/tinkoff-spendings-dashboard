# Spendings dashboard (Next.js + shadcn) — design

## Goal

Сделать локальный веб-дашборд поверх `spendings.sqlite` (SQLite) для анализа расходов/доходов с фильтрами и базовыми визуализациями.

## Non-goals (пока)

- Редактирование/категоризация операций в UI
- Импорт новых файлов через UI
- Авторизация/мультиюзерность
- Сложные “бюджеты/план-факт”, прогнозирование

## Data source

- SQLite файл: `spendings.sqlite`
- Таблица: `operations`
- Ключевые поля:
  - `operation_datetime` (ISO string в БД)
  - `payment_date` (ISO date в БД)
  - `operation_amount` (REAL; расходы < 0, доходы > 0)
  - `operation_currency`
  - `category`
  - `description`
  - `status` (часто `OK`)

## Architecture (Option A)

Next.js App Router + серверные API endpoints, которые читают SQLite и отдают JSON.

### Why

- БД остаётся на серверной стороне (не уезжает в браузер)
- Простые SQL-запросы, быстрый отклик
- Естественно ложится на “dashboard UI → query params → JSON → рендер”

## UX / IA

### Route

- `/dashboard` — основной экран

### Layout

Выбран вариант **A**: **фильтры сверху (toolbar)**.

### Toolbar filters

- **Период**:
  - `from` и `to` (date inputs)
  - фильтрация по умолчанию: **по `operation_datetime`**
- **Тип операции** (три состояния):
  - `all | expense | income`
  - `expense`: `operation_amount < 0`
  - `income`: `operation_amount > 0`
- **Категории**:
  - multi-select
  - применяет `category IN (...)`
- **Валюта**:
  - select (минимум: `RUB`, но список берём из БД)
- **Поиск**:
  - строка поиска по `description` (substring / LIKE)
- (опционально позже) “Только OK”
  - чекбокс `status = 'OK'` vs все статусы

### Content blocks

- KPI cards:
  - Income, Expense, Net (по текущим фильтрам)
- Charts:
  - By month: income/expense (+ net) series
  - Top categories: bar chart
- Transactions table:
  - date/time, category, description, amount, currency, status
  - пагинация + сортировка по времени (desc)

## API contracts (draft)

### `GET /api/categories`

Returns category list for filter UI.

Query params:
- `from`, `to`, `type`, `currency`, `q` (опционально, чтобы список категорий сужался под фильтры)

Response:
- `categories: Array<{ name: string; expense: number; income: number; count: number }>`

### `GET /api/summary`

Query params:
- `from`, `to` (по `operation_datetime`)
- `type=all|expense|income`
- `categories=...` (repeatable)
- `currency=...`
- `q=...`

Response:
- `totals: { income: number; expense: number; net: number }`
- `byMonth: Array<{ ym: string; income: number; expense: number; net: number }>`
- `topCategories: Array<{ name: string; amount: number }>`

### `GET /api/transactions`

Query params:
- те же фильтры
- `page`, `pageSize`

Response:
- `total: number`
- `rows: Array<{ operation_datetime: string|null; category: string|null; description: string|null; operation_amount: number|null; operation_currency: string|null; status: string|null }>`

## Implementation notes

- SQLite access: через node sqlite driver (например `better-sqlite3`) в server runtime.
- DB path:
  - по умолчанию читаем `spendings.sqlite` из корня репо
  - путь можно переопределить через env `SPENDINGS_DB_PATH`
- Safety:
  - только read-only запросы
  - параметризация (никакого string-concat в SQL)

## Acceptance criteria

- `pnpm dev` / `npm run dev` поднимает UI
- На `/dashboard`:
  - фильтры меняют KPI/графики/таблицу
  - multi-select категорий работает
  - тип `Все/Расходы/Доходы` работает
  - период from/to работает по `operation_datetime`

