"use client";

import { Card } from "@/components/ui/card";

export function Kpis(props: { income: number; expense: number; net: number }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(
      n
    );

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card className="p-4">
        <div className="text-xs text-muted-foreground">Доходы</div>
        <div className="mt-2 text-2xl font-semibold">{fmt(props.income)}</div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-muted-foreground">Расходы</div>
        <div className="mt-2 text-2xl font-semibold">{fmt(props.expense)}</div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-muted-foreground">Сальдо</div>
        <div className="mt-2 text-2xl font-semibold">{fmt(props.net)}</div>
      </Card>
    </div>
  );
}

