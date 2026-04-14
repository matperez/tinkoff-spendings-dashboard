"use client";

import * as React from "react";

import { FiltersBar } from "@/components/dashboard/FiltersBar";
import { Charts } from "@/components/dashboard/Charts";
import { Kpis } from "@/components/dashboard/Kpis";
import { TransactionsTable } from "@/components/dashboard/TransactionsTable";

import type {
  CategoriesResponse,
  DashboardFilters,
  SummaryResponse,
  TransactionsResponse,
} from "@/components/dashboard/types";

function toSearchParams(filters: DashboardFilters, opts?: { includeCategories?: boolean }) {
  const sp = new URLSearchParams();
  if (filters.from) sp.set("from", filters.from);
  if (filters.to) sp.set("to", filters.to);
  sp.set("type", filters.type);
  if (filters.currency) sp.set("currency", filters.currency);
  if (filters.q) sp.set("q", filters.q);
  if (opts?.includeCategories ?? true) {
    for (const c of filters.categories) sp.append("category", c);
  }
  return sp;
}

export default function DashboardPage() {
  const [filters, setFilters] = React.useState<DashboardFilters>({
    from: undefined,
    to: undefined,
    type: "all",
    currency: "RUB",
    q: undefined,
    categories: [],
  });
  const [page, setPage] = React.useState(1);

  const [summary, setSummary] = React.useState<SummaryResponse | null>(null);
  const [cats, setCats] = React.useState<CategoriesResponse | null>(null);
  const [tx, setTx] = React.useState<TransactionsResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  const params = React.useMemo(() => toSearchParams(filters, { includeCategories: true }), [filters]);
  const catsParams = React.useMemo(
    () => toSearchParams(filters, { includeCategories: false }),
    [filters]
  );

  React.useEffect(() => {
    // Reset pagination when filters change
    setPage(1);
  }, [params.toString()]);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const [summaryRes, catsRes, txRes] = await Promise.all([
          fetch(`/api/summary?${params.toString()}`),
          fetch(`/api/categories?${catsParams.toString()}`),
          fetch(`/api/transactions?${params.toString()}&page=${page}&pageSize=50`),
        ]);

        if (cancelled) return;
        setSummary((await summaryRes.json()) as SummaryResponse);
        setCats((await catsRes.json()) as CategoriesResponse);
        setTx((await txRes.json()) as TransactionsResponse);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [params.toString(), catsParams.toString(), page]);

  const allCategories = React.useMemo(() => {
    const names = (cats?.categories ?? []).map((c) => c.name).filter(Boolean);
    return names;
  }, [cats]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Spendings Dashboard</div>
          <div className="text-sm text-muted-foreground">
            Фильтры: дата от/до • тип • категории • валюта • поиск
          </div>
        </div>
        <div className="text-xs text-muted-foreground">{loading ? "Обновление…" : ""}</div>
      </div>

      <FiltersBar
        filters={filters}
        onChange={(next) => setFilters(next)}
        currencies={summary?.currencies ?? ["RUB"]}
        allCategories={allCategories}
      />

      <Kpis
        income={summary?.totals.income ?? 0}
        expense={summary?.totals.expense ?? 0}
        net={summary?.totals.net ?? 0}
      />

      <Charts byMonth={summary?.byMonth ?? []} topCategories={summary?.topCategories ?? []} />

      <TransactionsTable data={tx} loading={loading} onPageChange={setPage} />
    </div>
  );
}

