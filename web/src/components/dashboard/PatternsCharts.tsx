"use client";

import * as React from "react";
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

const RU_WEEKDAY = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;

export function PatternsCharts(props: {
  byWeekday: Array<{ dow: number; income: number; expense: number; net: number; count: number }>;
  byMonth: Array<{ ym: string; income: number; expense: number; net: number; count: number }>;
  byHour: Array<{ hour: number; income: number; expense: number; net: number; count: number }>;
}) {
  const weekdayData = React.useMemo(() => {
    const map = new Map<number, (typeof props.byWeekday)[number]>();
    for (const r of props.byWeekday) map.set(r.dow, r);
    // Prefer Monday→Sunday order for humans
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.map((dow) => {
      const r = map.get(dow);
      return {
        name: RU_WEEKDAY[dow] ?? String(dow),
        income: r?.income ?? 0,
        expense: r?.expense ?? 0,
        net: r?.net ?? 0,
        count: r?.count ?? 0,
      };
    });
  }, [props.byWeekday]);

  const hourData = React.useMemo(() => {
    const map = new Map<number, (typeof props.byHour)[number]>();
    for (const r of props.byHour) map.set(r.hour, r);
    return Array.from({ length: 24 }, (_, h) => {
      const r = map.get(h);
      return {
        hour: `${String(h).padStart(2, "0")}:00`,
        income: r?.income ?? 0,
        expense: r?.expense ?? 0,
        net: r?.net ?? 0,
        count: r?.count ?? 0,
      };
    });
  }, [props.byHour]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card className="p-4">
        <div className="mb-2 text-sm font-medium">По дням недели</div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdayData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="income" name="Доход" fill="#16a34a" />
              <Bar dataKey="expense" name="Расход" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

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

      <Card className="p-4 lg:col-span-2">
        <div className="mb-2 text-sm font-medium">По часам</div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="hour" interval={1} tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="income" name="Доход" fill="#16a34a" />
              <Bar dataKey="expense" name="Расход" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

