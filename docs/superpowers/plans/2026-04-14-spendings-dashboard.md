# Spendings Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Next.js + shadcn dashboard with filters and charts over `spendings.sqlite`.

**Architecture:** Next.js App Router serves UI at `/dashboard` and provides server-side JSON endpoints (`/api/*`) that query SQLite read-only via a Node SQLite driver. The client fetches JSON with query params reflecting toolbar filters.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, SQLite (`better-sqlite3`), Recharts (charts).

---

## File structure (to be created)

- Create: `web/` (Next.js app)
- Create: `web/lib/db.ts` (SQLite connection helper)
- Create: `web/lib/sql.ts` (where-clause builder + param helpers)
- Create: `web/app/api/categories/route.ts`
- Create: `web/app/api/summary/route.ts`
- Create: `web/app/api/transactions/route.ts`
- Create: `web/app/dashboard/page.tsx`
- Create: `web/components/dashboard/FiltersBar.tsx`
- Create: `web/components/dashboard/Kpis.tsx`
- Create: `web/components/dashboard/Charts.tsx`
- Create: `web/components/dashboard/TransactionsTable.tsx`
- Create: `web/components/dashboard/types.ts`

## Task 1: Scaffold Next.js app

**Files:**
- Create: `web/*`

- [ ] **Step 1: Create Next.js app**

Run (from repo root):

```bash
mkdir -p web
cd web
npx create-next-app@latest . --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --no-turbopack
```

Expected: `web/package.json` created, `web/src/app/` exists.

- [ ] **Step 2: Add deps for DB + charts**

Run:

```bash
cd web
npm install better-sqlite3 zod recharts
npm install -D @types/better-sqlite3
```

Expected: dependencies added to `web/package.json`.

- [ ] **Step 3: Add env for DB path**

Create `web/.env.local`:

```bash
SPENDINGS_DB_PATH=../spendings.sqlite
```

## Task 2: Install shadcn/ui and required components

**Files:**
- Modify: `web/*` (shadcn config + installed components)

- [ ] **Step 1: Initialize shadcn**

Run:

```bash
cd web
npx shadcn@latest init -d
```

Choose defaults; ensure Tailwind + `src/` layout is detected.

- [ ] **Step 2: Install UI components used by dashboard**

Run:

```bash
cd web
npx shadcn@latest add button card input label badge separator tabs calendar popover command table select checkbox
```

Expected: components under `web/src/components/ui/*`.

## Task 3: DB access helpers (read-only)

**Files:**
- Create: `web/src/lib/db.ts`
- Create: `web/src/lib/sql.ts`

- [ ] **Step 1: Create `db.ts`**

Create `web/src/lib/db.ts`:

```ts
import Database from "better-sqlite3";
import path from "node:path";

let db: Database.Database | null = null;

export function getDb() {
  if (db) return db;

  const configured = process.env.SPENDINGS_DB_PATH ?? "../spendings.sqlite";
  const dbPath = path.resolve(process.cwd(), configured);

  db = new Database(dbPath, { readonly: true, fileMustExist: true });
  db.pragma("query_only = ON");
  return db;
}
```

- [ ] **Step 2: Create SQL filter helpers**

Create `web/src/lib/sql.ts`:

```ts
export type OpType = "all" | "expense" | "income";

export type Filters = {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  type?: OpType;
  categories?: string[];
  currency?: string;
  q?: string;
};

export function normalizeFilters(u: URL): Filters {
  const from = u.searchParams.get("from") ?? undefined;
  const to = u.searchParams.get("to") ?? undefined;
  const type = (u.searchParams.get("type") ?? "all") as OpType;
  const categories = u.searchParams.getAll("category").filter(Boolean);
  const currency = u.searchParams.get("currency") ?? undefined;
  const q = u.searchParams.get("q") ?? undefined;

  return {
    from,
    to,
    type: type === "expense" || type === "income" ? type : "all",
    categories: categories.length ? categories : undefined,
    currency: currency || undefined,
    q: q?.trim() ? q.trim() : undefined,
  };
}

export function buildWhere(f: Filters) {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};

  // operation_datetime is ISO like '2026-04-14T18:04:20'
  if (f.from) {
    clauses.push("operation_datetime >= @from");
    params.from = `${f.from}T00:00:00`;
  }
  if (f.to) {
    clauses.push("operation_datetime <= @to");
    params.to = `${f.to}T23:59:59`;
  }

  if (f.type === "expense") clauses.push("operation_amount < 0");
  if (f.type === "income") clauses.push("operation_amount > 0");

  if (f.categories?.length) {
    const inParams = f.categories.map((_, i) => `@cat${i}`);
    clauses.push(`COALESCE(category,'') IN (${inParams.join(",")})`);
    f.categories.forEach((c, i) => (params[`cat${i}`] = c));
  }

  if (f.currency) {
    clauses.push("operation_currency = @currency");
    params.currency = f.currency;
  }

  if (f.q) {
    clauses.push("description LIKE @q");
    params.q = `%${f.q}%`;
  }

  // default: only OK if present? keep all statuses unless user adds checkbox later

  return {
    whereSql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}
```

## Task 4: API endpoints

**Files:**
- Create: `web/src/app/api/categories/route.ts`
- Create: `web/src/app/api/summary/route.ts`
- Create: `web/src/app/api/transactions/route.ts`

- [ ] **Step 1: `GET /api/categories`**

Create `web/src/app/api/categories/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildWhere, normalizeFilters } from "@/lib/sql";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const f = normalizeFilters(url);
  const db = getDb();
  const { whereSql, params } = buildWhere(f);

  const rows = db
    .prepare(
      `
      SELECT
        COALESCE(NULLIF(TRIM(category), ''), '(no category)') AS name,
        COUNT(*) AS count,
        SUM(CASE WHEN operation_amount < 0 THEN -operation_amount ELSE 0 END) AS expense,
        SUM(CASE WHEN operation_amount > 0 THEN operation_amount ELSE 0 END) AS income
      FROM operations
      ${whereSql}
      GROUP BY name
      ORDER BY (expense + income) DESC
      `
    )
    .all(params);

  return NextResponse.json({ categories: rows });
}
```

- [ ] **Step 2: `GET /api/summary`**

Create `web/src/app/api/summary/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildWhere, normalizeFilters } from "@/lib/sql";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const f = normalizeFilters(url);
  const db = getDb();
  const { whereSql, params } = buildWhere(f);

  const totals = db
    .prepare(
      `
      SELECT
        COALESCE(SUM(CASE WHEN operation_amount > 0 THEN operation_amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN operation_amount < 0 THEN -operation_amount ELSE 0 END), 0) AS expense,
        COALESCE(SUM(operation_amount), 0) AS net
      FROM operations
      ${whereSql}
      `
    )
    .get(params);

  const byMonth = db
    .prepare(
      `
      SELECT
        SUBSTR(operation_datetime, 1, 7) AS ym,
        SUM(CASE WHEN operation_amount > 0 THEN operation_amount ELSE 0 END) AS income,
        SUM(CASE WHEN operation_amount < 0 THEN -operation_amount ELSE 0 END) AS expense,
        SUM(operation_amount) AS net
      FROM operations
      ${whereSql}
      AND operation_datetime IS NOT NULL
      GROUP BY ym
      ORDER BY ym
      `
    )
    .all(params);

  const topCategories = db
    .prepare(
      `
      SELECT
        COALESCE(NULLIF(TRIM(category), ''), '(no category)') AS name,
        SUM(
          CASE
            WHEN @type = 'income' THEN operation_amount
            ELSE -operation_amount
          END
        ) AS amount
      FROM operations
      ${whereSql}
      AND operation_amount ${f.type === "income" ? "> 0" : "< 0"}
      GROUP BY name
      ORDER BY amount DESC
      LIMIT 15
      `
    )
    .all({ ...params, type: f.type ?? "all" });

  return NextResponse.json({ totals, byMonth, topCategories });
}
```

- [ ] **Step 3: `GET /api/transactions`**

Create `web/src/app/api/transactions/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildWhere, normalizeFilters } from "@/lib/sql";

export const runtime = "nodejs";

function clampInt(v: string | null, d: number, min: number, max: number) {
  const n = Number.parseInt(v ?? "", 10);
  if (!Number.isFinite(n)) return d;
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const f = normalizeFilters(url);
  const page = clampInt(url.searchParams.get("page"), 1, 1, 10_000);
  const pageSize = clampInt(url.searchParams.get("pageSize"), 50, 10, 200);
  const offset = (page - 1) * pageSize;

  const db = getDb();
  const { whereSql, params } = buildWhere(f);

  const totalRow = db.prepare(`SELECT COUNT(*) AS total FROM operations ${whereSql}`).get(params) as { total: number };

  const rows = db
    .prepare(
      `
      SELECT
        operation_datetime,
        category,
        description,
        operation_amount,
        operation_currency,
        status
      FROM operations
      ${whereSql}
      ORDER BY operation_datetime DESC
      LIMIT @limit OFFSET @offset
      `
    )
    .all({ ...params, limit: pageSize, offset });

  return NextResponse.json({ total: totalRow.total, page, pageSize, rows });
}
```

## Task 5: Dashboard UI (`/dashboard`)

**Files:**
- Create: `web/src/app/dashboard/page.tsx`
- Create: `web/src/components/dashboard/*`

- [ ] **Step 1: Create basic page layout and client fetching**

Implement a page that:
1) renders toolbar filters (from/to/type/categories/currency/q)
2) fetches `/api/summary` + `/api/transactions` + `/api/categories` as filters change
3) shows KPI cards, charts, and a table

Use `useEffect` + `URLSearchParams` for simplicity (no complex state mgmt).

- [ ] **Step 2: Filters**

Use shadcn:
- `Tabs` or segmented `Button` group for type
- `Popover + Calendar` for from/to (or simple `<input type="date">` if faster)
- `Command` for category multiselect

- [ ] **Step 3: Charts**

Use `recharts`:
- LineChart for byMonth series (income/expense)
- BarChart for top categories

- [ ] **Step 4: Transactions table**

Use shadcn `Table` + pagination buttons.

## Task 6: Verification

**Files:**
- Modify: as needed

- [ ] **Step 1: Run dev server**

```bash
cd web
npm run dev
```

Expected: open `http://localhost:3000/dashboard` and see data.

- [ ] **Step 2: Manual checks**

- Change type `All → Expense → Income` and verify totals & table change
- Set `from/to` narrow range and verify change
- Pick category and verify change
- Search by merchant substring (e.g. "Пятёрочка") and verify filtered results

