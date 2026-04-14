import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { andWhere, buildWhere, normalizeFilters } from "@/lib/sql";

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

  const byMonthWhere = andWhere(whereSql, "operation_datetime IS NOT NULL");
  const byMonth = db
    .prepare(
      `
      SELECT
        SUBSTR(operation_datetime, 1, 7) AS ym,
        SUM(CASE WHEN operation_amount > 0 THEN operation_amount ELSE 0 END) AS income,
        SUM(CASE WHEN operation_amount < 0 THEN -operation_amount ELSE 0 END) AS expense,
        SUM(operation_amount) AS net
      FROM operations
      ${byMonthWhere}
      GROUP BY ym
      ORDER BY ym
      `
    )
    .all(params);

  const topMode = f.type === "income" ? "income" : "expense";
  const topWhere = andWhere(
    whereSql,
    topMode === "income" ? "operation_amount > 0" : "operation_amount < 0"
  );
  const topCategories = db
    .prepare(
      `
      SELECT
        COALESCE(NULLIF(TRIM(category), ''), '(no category)') AS name,
        SUM(${topMode === "income" ? "operation_amount" : "-operation_amount"}) AS amount
      FROM operations
      ${topWhere}
      GROUP BY name
      ORDER BY amount DESC
      LIMIT 15
      `
    )
    .all(params);

  const currencies = db
    .prepare(
      `
      SELECT DISTINCT operation_currency AS currency
      FROM operations
      WHERE operation_currency IS NOT NULL AND TRIM(operation_currency) != ''
      ORDER BY currency
      `
    )
    .all()
    .map((r: any) => r.currency as string);

  return NextResponse.json({ totals, byMonth, topCategories, currencies });
}

