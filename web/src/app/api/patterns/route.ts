import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { andWhere, buildWhere, normalizeFilters } from "@/lib/sql";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const f = normalizeFilters(url);
  const db = getDb();
  const { whereSql, params } = buildWhere(f);

  const baseWhere = andWhere(whereSql, "operation_datetime IS NOT NULL");

  const byWeekday = db
    .prepare(
      `
      SELECT
        CAST(strftime('%w', operation_datetime) AS INTEGER) AS dow,
        SUM(CASE WHEN operation_amount > 0 THEN operation_amount ELSE 0 END) AS income,
        SUM(CASE WHEN operation_amount < 0 THEN -operation_amount ELSE 0 END) AS expense,
        SUM(operation_amount) AS net,
        COUNT(*) AS count
      FROM operations
      ${baseWhere}
      GROUP BY dow
      ORDER BY dow
      `
    )
    .all(params);

  const byMonth = db
    .prepare(
      `
      SELECT
        SUBSTR(operation_datetime, 1, 7) AS ym,
        SUM(CASE WHEN operation_amount > 0 THEN operation_amount ELSE 0 END) AS income,
        SUM(CASE WHEN operation_amount < 0 THEN -operation_amount ELSE 0 END) AS expense,
        SUM(operation_amount) AS net,
        COUNT(*) AS count
      FROM operations
      ${baseWhere}
      GROUP BY ym
      ORDER BY ym
      `
    )
    .all(params);

  const byHour = db
    .prepare(
      `
      SELECT
        CAST(strftime('%H', operation_datetime) AS INTEGER) AS hour,
        SUM(CASE WHEN operation_amount > 0 THEN operation_amount ELSE 0 END) AS income,
        SUM(CASE WHEN operation_amount < 0 THEN -operation_amount ELSE 0 END) AS expense,
        SUM(operation_amount) AS net,
        COUNT(*) AS count
      FROM operations
      ${baseWhere}
      GROUP BY hour
      ORDER BY hour
      `
    )
    .all(params);

  return NextResponse.json({ byWeekday, byMonth, byHour });
}

