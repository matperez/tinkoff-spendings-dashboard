import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { buildWhere, normalizeFilters } from "@/lib/sql";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const f = normalizeFilters(url);
  const db = getDb();
  // Important: ignore `category` filter here so the user can expand the selection
  // by clicking additional categories in the UI.
  const { whereSql, params } = buildWhere({ ...f, categories: undefined });

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

