"use client";

import * as React from "react";

import { FiltersBar } from "@/components/dashboard/FiltersBar";
import { Kpis } from "@/components/dashboard/Kpis";
import { PatternsCharts } from "@/components/dashboard/PatternsCharts";
import { TopNav } from "@/components/dashboard/TopNav";
import { Checkbox } from "@/components/ui/checkbox";

import type {
  CategoriesResponse,
  DashboardFilters,
  PatternsResponse,
  SummaryResponse,
} from "@/components/dashboard/types";

function toSearchParams(filters: DashboardFilters, opts?: { includeCategories?: boolean }) {
  const sp = new URLSearchParams();
  if (filters.from) sp.set("from", filters.from);
  if (filters.to) sp.set("to", filters.to);
  sp.set("type", filters.type);
  if (filters.currency) sp.set("currency", filters.currency);
  if (filters.q) sp.set("q", filters.q);
  if (filters.minAmount > 0) sp.set("minAmount", String(filters.minAmount));
  if (filters.maxAmount >= 0) sp.set("maxAmount", String(filters.maxAmount));
  if (opts?.includeCategories ?? true) {
    for (const c of filters.categories) sp.append("category", c);
    for (const c of filters.excludeCategories) sp.append("excludeCategory", c);
  }
  return sp;
}

export default function PatternsPage() {
  const [amountMax, setAmountMax] = React.useState<number>(50_000);
  const [unitNormalized, setUnitNormalized] = React.useState(false);
  const [filters, setFilters] = React.useState<DashboardFilters>({
    from: undefined,
    to: undefined,
    type: "all",
    currency: "RUB",
    q: undefined,
    categories: [],
    excludeCategories: [],
    minAmount: 0,
    maxAmount: 50_000,
  });
  const [loading, setLoading] = React.useState(false);

  const [summary, setSummary] = React.useState<SummaryResponse | null>(null);
  const [cats, setCats] = React.useState<CategoriesResponse | null>(null);
  const [patterns, setPatterns] = React.useState<PatternsResponse | null>(null);

  const params = React.useMemo(() => toSearchParams(filters, { includeCategories: true }), [filters]);
  const catsParams = React.useMemo(
    () => toSearchParams(filters, { includeCategories: false }),
    [filters]
  );
  const patternsParams = React.useMemo(() => {
    const sp = new URLSearchParams(params);
    if (unitNormalized) sp.set("perDay", "1");
    return sp;
  }, [params, unitNormalized]);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const [summaryRes, catsRes, patternsRes] = await Promise.all([
          fetch(`/api/summary?${params.toString()}`),
          fetch(`/api/categories?${catsParams.toString()}`),
          fetch(`/api/patterns?${patternsParams.toString()}`),
        ]);

        if (cancelled) return;
        const s = (await summaryRes.json()) as SummaryResponse;
        setSummary(s);
        setCats((await catsRes.json()) as CategoriesResponse);
        setPatterns((await patternsRes.json()) as PatternsResponse);
        setAmountMax((prev) => {
          const next = Math.max(1000, Math.ceil(s.amountMax || 0));
          if (filters.maxAmount === prev) {
            setFilters((f0) => ({ ...f0, maxAmount: next }));
          }
          return next;
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [params.toString(), catsParams.toString(), patternsParams.toString()]);

  const allCategories = React.useMemo(() => {
    const names = (cats?.categories ?? []).map((c) => c.name).filter(Boolean);
    return names;
  }, [cats]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-6">
      <TopNav />

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Закономерности</div>
          <div className="text-sm text-muted-foreground">
            Группировки: дни недели • месяцы (с учётом текущих фильтров)
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={unitNormalized} onCheckedChange={(v) => setUnitNormalized(v === true)} />
            Удельные траты
          </label>
          <div className="text-xs text-muted-foreground">{loading ? "Обновление…" : ""}</div>
        </div>
      </div>

      <FiltersBar
        filters={filters}
        onChange={(next) => setFilters(next)}
        currencies={summary?.currencies ?? ["RUB"]}
        allCategories={allCategories}
        amountMax={amountMax}
      />

      <Kpis
        income={summary?.totals.income ?? 0}
        expense={summary?.totals.expense ?? 0}
        net={summary?.totals.net ?? 0}
      />

      <PatternsCharts
        byWeekday={patterns?.byWeekday ?? []}
        byMonth={patterns?.byMonth ?? []}
        byHour={patterns?.byHour ?? []}
      />
    </div>
  );
}

