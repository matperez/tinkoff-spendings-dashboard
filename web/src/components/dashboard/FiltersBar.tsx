"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { DashboardFilters, OpType } from "./types";

function toggleArrayValue(arr: string[], v: string) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function FiltersBar(props: {
  filters: DashboardFilters;
  onChange: (next: DashboardFilters) => void;
  currencies: string[];
  allCategories: string[];
}) {
  const { filters, onChange } = props;
  const [categoriesExpanded, setCategoriesExpanded] = React.useState(false);

  const setType = (t: OpType) => onChange({ ...filters, type: t });
  const setFrom = (from: string) => onChange({ ...filters, from: from || undefined });
  const setTo = (to: string) => onChange({ ...filters, to: to || undefined });
  const setCurrency = (currency: string) =>
    onChange({ ...filters, currency: currency || undefined });
  const setQ = (q: string) => onChange({ ...filters, q: q || undefined });

  const toggleIncludeCategory = (c: string) => {
    onChange({
      ...filters,
      categories: toggleArrayValue(filters.categories, c),
      excludeCategories: filters.excludeCategories.filter((x) => x !== c),
    });
  };

  const toggleExcludeCategory = (c: string) => {
    onChange({
      ...filters,
      excludeCategories: toggleArrayValue(filters.excludeCategories, c),
      categories: filters.categories.filter((x) => x !== c),
    });
  };

  return (
    <Card className="p-3">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
              <div className="text-xs text-muted-foreground">От</div>
              <Input
                type="date"
                value={filters.from ?? ""}
                onChange={(e) => setFrom(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs text-muted-foreground">До</div>
              <Input
                type="date"
                value={filters.to ?? ""}
                onChange={(e) => setTo(e.target.value)}
                className="w-[160px]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-xs text-muted-foreground">Тип</div>
            <Tabs value={filters.type} onValueChange={(v) => setType(v as OpType)}>
              <TabsList>
                <TabsTrigger value="all">Все</TabsTrigger>
                <TabsTrigger value="expense">Расходы</TabsTrigger>
                <TabsTrigger value="income">Доходы</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-xs text-muted-foreground">Валюта</div>
            <Input
              list="currencies"
              value={filters.currency ?? ""}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="RUB"
              className="w-[120px]"
            />
            <datalist id="currencies">
              {props.currencies.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-1 flex-col gap-1">
            <div className="text-xs text-muted-foreground">Поиск (описание)</div>
            <Input
              value={filters.q ?? ""}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Например: Пятёрочка"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            Категории (клик — добавить, ⌘+клик — исключить):
          </div>
          <div className="flex flex-wrap gap-2">
            {(categoriesExpanded ? props.allCategories : props.allCategories.slice(0, 30)).map((c) => {
              const included = filters.categories.includes(c);
              const excluded = filters.excludeCategories.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={(e) => {
                    if (e.metaKey) toggleExcludeCategory(c);
                    else toggleIncludeCategory(c);
                  }}
                  className="text-left"
                >
                  <Badge
                    variant={included ? "default" : excluded ? "outline" : "secondary"}
                    className={
                      included
                        ? "bg-blue-600 text-white hover:bg-blue-600/90 dark:bg-blue-500 dark:hover:bg-blue-500/90"
                        : excluded
                          ? "border-red-500 text-red-700 line-through dark:text-red-300"
                          : undefined
                    }
                  >
                    {c}
                  </Badge>
                </button>
              );
            })}
            {props.allCategories.length > 30 && !categoriesExpanded ? (
              <button
                type="button"
                onClick={() => setCategoriesExpanded(true)}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                + ещё {props.allCategories.length - 30}
              </button>
            ) : null}
            {props.allCategories.length > 30 && categoriesExpanded ? (
              <button
                type="button"
                onClick={() => setCategoriesExpanded(false)}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Свернуть
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                onChange({
                  from: undefined,
                  to: undefined,
                  type: "all",
                  currency: undefined,
                  q: undefined,
                  categories: [],
                  excludeCategories: [],
                })
              }
            >
              Сбросить
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

