from __future__ import annotations

import argparse
import datetime as dt
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pandas as pd


SUPPORTED_EXTS = {".csv", ".xlsx", ".xls"}


@dataclass(frozen=True)
class ImportStats:
    files_seen: int
    rows_seen: int
    rows_inserted: int


def _iter_input_files(data_dir: Path) -> list[Path]:
    files: list[Path] = []
    for p in sorted(data_dir.glob("*")):
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTS:
            files.append(p)
    return files


def _parse_ru_decimal_series(s: pd.Series) -> pd.Series:
    if s is None:
        return s
    if not pd.api.types.is_string_dtype(s):
        s = s.astype("string")
    s = s.str.replace("\u00a0", "", regex=False)  # NBSP
    s = s.str.replace(" ", "", regex=False)
    s = s.str.replace(",", ".", regex=False)
    s = s.replace("", pd.NA)
    return pd.to_numeric(s, errors="coerce")


def _read_any_table(path: Path) -> pd.DataFrame:
    ext = path.suffix.lower()
    if ext == ".csv":
        # These bank exports commonly use ; and "…", with comma decimals.
        df = pd.read_csv(path, sep=";", quotechar='"', dtype="string", encoding_errors="replace")
        return df
    if ext in {".xlsx", ".xls"}:
        # Try first sheet; users often have a single relevant sheet.
        df = pd.read_excel(path, sheet_name=0, dtype="string")
        return df
    raise ValueError(f"Unsupported file extension: {ext}")


def _normalize_df(df: pd.DataFrame) -> pd.DataFrame:
    # Keep original columns; also create a normalized set used for analysis.
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]

    col_map = {
        "Дата операции": "operation_datetime",
        "Дата платежа": "payment_date",
        "Номер карты": "card",
        "Статус": "status",
        "Сумма операции": "operation_amount",
        "Валюта операции": "operation_currency",
        "Сумма платежа": "payment_amount",
        "Валюта платежа": "payment_currency",
        "Кэшбэк": "cashback",
        "Категория": "category",
        "MCC": "mcc",
        "Описание": "description",
        "Бонусы (включая кэшбэк)": "bonuses_total",
        "Округление на инвесткопилку": "rounding_to_piggy",
        "Сумма операции с округлением": "operation_amount_rounded",
    }

    for src, dst in col_map.items():
        if src in df.columns and dst not in df.columns:
            df[dst] = df[src]

    # Parse amounts
    for c in [
        "operation_amount",
        "payment_amount",
        "cashback",
        "bonuses_total",
        "rounding_to_piggy",
        "operation_amount_rounded",
    ]:
        if c in df.columns:
            df[c] = _parse_ru_decimal_series(df[c])

    # Parse dates
    if "operation_datetime" in df.columns:
        df["operation_datetime"] = pd.to_datetime(
            df["operation_datetime"], errors="coerce", dayfirst=True, format="%d.%m.%Y %H:%M:%S"
        )
    if "payment_date" in df.columns:
        df["payment_date"] = pd.to_datetime(df["payment_date"], errors="coerce", dayfirst=True).dt.date

    # Normalize strings
    for c in ["status", "category", "description", "mcc", "card", "operation_currency", "payment_currency"]:
        if c in df.columns:
            df[c] = df[c].astype("string").str.strip()

    return df


def _ensure_schema(conn: sqlite3.Connection) -> None:
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS operations (
          id INTEGER PRIMARY KEY,

          operation_datetime TEXT,
          payment_date TEXT,
          card TEXT,
          status TEXT,

          operation_amount REAL,
          operation_currency TEXT,
          payment_amount REAL,
          payment_currency TEXT,

          cashback REAL,
          category TEXT,
          mcc TEXT,
          description TEXT,

          bonuses_total REAL,
          rounding_to_piggy REAL,
          operation_amount_rounded REAL,

          source_file TEXT NOT NULL,
          source_row INTEGER NOT NULL,
          imported_at TEXT NOT NULL,

          UNIQUE(source_file, source_row)
        );
        """
    )

    conn.execute("CREATE INDEX IF NOT EXISTS idx_operations_dt ON operations(operation_datetime);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_operations_category ON operations(category);")


def _insert_rows(conn: sqlite3.Connection, df: pd.DataFrame, *, source_file: str) -> int:
    imported_at = dt.datetime.now(dt.timezone.utc).isoformat()

    cols = [
        "operation_datetime",
        "payment_date",
        "card",
        "status",
        "operation_amount",
        "operation_currency",
        "payment_amount",
        "payment_currency",
        "cashback",
        "category",
        "mcc",
        "description",
        "bonuses_total",
        "rounding_to_piggy",
        "operation_amount_rounded",
    ]

    for c in cols:
        if c not in df.columns:
            df[c] = pd.NA

    def _val(v):
        if v is None or (isinstance(v, float) and pd.isna(v)) or (hasattr(pd, "isna") and pd.isna(v)):
            return None
        if isinstance(v, (dt.datetime, dt.date)):
            return v.isoformat()
        return v

    rows = []
    for i, r in enumerate(df.itertuples(index=False), start=2):
        d = {c: getattr(r, c) for c in cols}
        rows.append(
            (
                _val(d["operation_datetime"]),
                _val(d["payment_date"]),
                _val(d["card"]),
                _val(d["status"]),
                _val(d["operation_amount"]),
                _val(d["operation_currency"]),
                _val(d["payment_amount"]),
                _val(d["payment_currency"]),
                _val(d["cashback"]),
                _val(d["category"]),
                _val(d["mcc"]),
                _val(d["description"]),
                _val(d["bonuses_total"]),
                _val(d["rounding_to_piggy"]),
                _val(d["operation_amount_rounded"]),
                source_file,
                i,
                imported_at,
            )
        )

    cur = conn.executemany(
        """
        INSERT OR IGNORE INTO operations (
          operation_datetime, payment_date, card, status,
          operation_amount, operation_currency, payment_amount, payment_currency,
          cashback, category, mcc, description,
          bonuses_total, rounding_to_piggy, operation_amount_rounded,
          source_file, source_row, imported_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """,
        rows,
    )
    return cur.rowcount if cur.rowcount is not None else 0


def import_all(data_dir: Path, db_path: Path) -> ImportStats:
    files = _iter_input_files(data_dir)
    rows_seen = 0
    rows_inserted = 0

    with sqlite3.connect(db_path) as conn:
        _ensure_schema(conn)
        for f in files:
            raw = _read_any_table(f)
            df = _normalize_df(raw)
            rows_seen += len(df)
            # Store a stable identifier so renaming the folder doesn't duplicate imports.
            # If you ever have two different files with the same name, consider
            # switching this to a (name + size + mtime) or a content hash.
            source_file = f.name
            rows_inserted += _insert_rows(conn, df, source_file=source_file)
        conn.commit()

    return ImportStats(files_seen=len(files), rows_seen=rows_seen, rows_inserted=rows_inserted)


def _q(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> list[tuple]:
    return list(conn.execute(sql, params))


def print_basic_analysis(db_path: Path) -> None:
    with sqlite3.connect(db_path) as conn:
        total_rows = _q(conn, "SELECT COUNT(*) FROM operations;")[0][0]
        dt_min, dt_max = _q(conn, "SELECT MIN(operation_datetime), MAX(operation_datetime) FROM operations;")[0]

        print(f"Rows in DB: {total_rows}")
        print(f"Date range: {dt_min} .. {dt_max}")
        print()

        income, expense = _q(
            conn,
            """
            SELECT
              COALESCE(SUM(CASE WHEN operation_amount > 0 THEN operation_amount END), 0),
              COALESCE(SUM(CASE WHEN operation_amount < 0 THEN -operation_amount END), 0)
            FROM operations
            WHERE status = 'OK' OR status IS NULL;
            """,
        )[0]
        print(f"Total income:  {income:,.2f}")
        print(f"Total expense: {expense:,.2f}")
        print(f"Net:           {(income - expense):,.2f}")
        print()

        print("Top categories (expense):")
        for cat, amount in _q(
            conn,
            """
            SELECT COALESCE(NULLIF(TRIM(category), ''), '(no category)') AS cat,
                   SUM(-operation_amount) AS amount
            FROM operations
            WHERE operation_amount < 0 AND (status = 'OK' OR status IS NULL)
            GROUP BY cat
            ORDER BY amount DESC
            LIMIT 15;
            """,
        ):
            print(f"- {cat}: {amount:,.2f}")
        print()

        print("By month (income/expense/net):")
        for ym, inc, exp, net in _q(
            conn,
            """
            SELECT
              SUBSTR(operation_datetime, 1, 7) AS ym,
              SUM(CASE WHEN operation_amount > 0 THEN operation_amount ELSE 0 END) AS income,
              SUM(CASE WHEN operation_amount < 0 THEN -operation_amount ELSE 0 END) AS expense,
              SUM(operation_amount) AS net
            FROM operations
            WHERE operation_datetime IS NOT NULL AND (status = 'OK' OR status IS NULL)
            GROUP BY ym
            ORDER BY ym;
            """,
        ):
            print(f"- {ym}: income {inc:,.2f} | expense {exp:,.2f} | net {net:,.2f}")


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=Path("export"))
    parser.add_argument("--db", type=Path, default=Path("data/spendings.sqlite"))
    args = parser.parse_args(list(argv) if argv is not None else None)

    if not args.data_dir.exists():
        raise SystemExit(f"Data dir not found: {args.data_dir}")

    stats = import_all(args.data_dir, args.db)
    print(f"Imported: {stats.rows_inserted} new rows from {stats.files_seen} files (seen {stats.rows_seen} rows).")
    print()
    print_basic_analysis(args.db)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

