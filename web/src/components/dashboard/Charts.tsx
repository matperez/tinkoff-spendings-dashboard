"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";

export function Charts(props: {
  byMonth: Array<{ ym: string; income: number; expense: number; net: number }>;
  topCategories: Array<{ name: string; amount: number }>;
}) {
  const topMinPositive = props.topCategories.reduce<number>((acc, r) => {
    const v = typeof r.amount === "number" ? r.amount : 0;
    if (v > 0 && (acc === 0 || v < acc)) return v;
    return acc;
  }, 0);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card className="p-4">
        <div className="mb-2 text-sm font-medium">По месяцам</div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={props.byMonth}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="ym" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="income" name="Доход" stroke="#16a34a" dot={false} />
              <Line
                type="monotone"
                dataKey="expense"
                name="Расход"
                stroke="#dc2626"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-2 text-sm font-medium">Топ категорий</div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={props.topCategories}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" hide />
              <YAxis
                scale="log"
                domain={[
                  Math.max(1, Math.floor(topMinPositive || 1)),
                  "auto",
                ]}
              />
              <Tooltip />
              <Bar dataKey="amount" name="Сумма" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Логарифмическая шкала помогает увидеть “длинный хвост”. Наведите курсор, чтобы увидеть категорию.
        </div>
      </Card>
    </div>
  );
}

