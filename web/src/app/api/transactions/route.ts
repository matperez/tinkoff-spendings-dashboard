import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { andWhere, buildWhere, normalizeFilters } from "@/lib/sql";

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

  const totalRow = db
    .prepare(`SELECT COUNT(*) AS total FROM operations ${whereSql}`)
    .get(params) as { total: number };

  const orderWhere = andWhere(whereSql, "operation_datetime IS NOT NULL");
  const rows = db
    .prepare(
      `
      SELECT
        operation_datetime,
        payment_date,
        category,
        description,
        operation_amount,
        operation_currency,
        status,
        card
      FROM operations
      ${orderWhere}
      ORDER BY operation_datetime DESC
      LIMIT @limit OFFSET @offset
      `
    )
    .all({ ...params, limit: pageSize, offset });

  return NextResponse.json({ total: totalRow.total, page, pageSize, rows });
}

