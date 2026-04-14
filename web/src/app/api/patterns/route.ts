import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { andWhere, buildWhere, normalizeFilters } from "@/lib/sql";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const f = normalizeFilters(url);
  const normalizedPerDay = url.searchParams.get("perDay") === "1";
  const db = getDb();
  const { whereSql, params } = buildWhere(f);

  const baseWhere = andWhere(whereSql, "operation_datetime IS NOT NULL");

  const byWeekday = db
    .prepare(
      normalizedPerDay
        ? `
      WITH days AS (
        SELECT DISTINCT SUBSTR(operation_datetime, 1, 10) AS d
        FROM operations
        ${baseWhere}
      ),
      days_by_dow AS (
        SELECT CAST(strftime('%w', d) AS INTEGER) AS dow, COUNT(*) AS dayCount
        FROM days
        GROUP BY dow
      ),
      sums AS (
        SELECT
          CAST(strftime('%w', operation_datetime) AS INTEGER) AS dow,
          SUM(CASE WHEN operation_amount > 0 THEN operation_amount ELSE 0 END) AS income,
          SUM(CASE WHEN operation_amount < 0 THEN -operation_amount ELSE 0 END) AS expense,
          SUM(operation_amount) AS net,
          COUNT(*) AS count
        FROM operations
        ${baseWhere}
        GROUP BY dow
      )
      SELECT
        s.dow AS dow,
        s.income / COALESCE(d.dayCount, 1) AS income,
        s.expense / COALESCE(d.dayCount, 1) AS expense,
        s.net / COALESCE(d.dayCount, 1) AS net,
        s.count AS count
      FROM sums s
      LEFT JOIN days_by_dow d ON d.dow = s.dow
      ORDER BY s.dow
      `
        : `
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
      normalizedPerDay
        ? `
      WITH days AS (
        SELECT DISTINCT SUBSTR(operation_datetime, 1, 10) AS d
        FROM operations
        ${baseWhere}
      ),
      days_by_ym AS (
        SELECT SUBSTR(d, 1, 7) AS ym, COUNT(*) AS dayCount
        FROM days
        GROUP BY ym
      ),
      sums AS (
        SELECT
          SUBSTR(operation_datetime, 1, 7) AS ym,
          SUM(CASE WHEN operation_amount > 0 THEN operation_amount ELSE 0 END) AS income,
          SUM(CASE WHEN operation_amount < 0 THEN -operation_amount ELSE 0 END) AS expense,
          SUM(operation_amount) AS net,
          COUNT(*) AS count
        FROM operations
        ${baseWhere}
        GROUP BY ym
      )
      SELECT
        s.ym AS ym,
        s.income / COALESCE(d.dayCount, 1) AS income,
        s.expense / COALESCE(d.dayCount, 1) AS expense,
        s.net / COALESCE(d.dayCount, 1) AS net,
        s.count AS count
      FROM sums s
      LEFT JOIN days_by_ym d ON d.ym = s.ym
      ORDER BY s.ym
      `
        : `
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
      normalizedPerDay
        ? `
      WITH days AS (
        SELECT DISTINCT SUBSTR(operation_datetime, 1, 10) AS d
        FROM operations
        ${baseWhere}
      ),
      day_count AS (SELECT COUNT(*) AS n FROM days),
      sums AS (
        SELECT
          CAST(strftime('%H', operation_datetime) AS INTEGER) AS hour,
          SUM(CASE WHEN operation_amount > 0 THEN operation_amount ELSE 0 END) AS income,
          SUM(CASE WHEN operation_amount < 0 THEN -operation_amount ELSE 0 END) AS expense,
          SUM(operation_amount) AS net,
          COUNT(*) AS count
        FROM operations
        ${baseWhere}
        GROUP BY hour
      )
      SELECT
        s.hour AS hour,
        s.income / COALESCE((SELECT n FROM day_count), 1) AS income,
        s.expense / COALESCE((SELECT n FROM day_count), 1) AS expense,
        s.net / COALESCE((SELECT n FROM day_count), 1) AS net,
        s.count AS count
      FROM sums s
      ORDER BY s.hour
      `
        : `
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

  return NextResponse.json({ byWeekday, byMonth, byHour, meta: { normalizedPerDay } });
}

