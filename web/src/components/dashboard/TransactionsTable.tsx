"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { TransactionsResponse } from "./types";

export function TransactionsTable(props: {
  data: TransactionsResponse | null;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  const fmt = React.useMemo(
    () =>
      new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }),
    []
  );

  const total = props.data?.total ?? 0;
  const page = props.data?.page ?? 1;
  const pageSize = props.data?.pageSize ?? 50;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-medium">Транзакции</div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">
            {total.toLocaleString("ru-RU")} строк • стр. {page} / {pageCount}
          </div>
          <Button
            variant="secondary"
            disabled={props.loading || page <= 1}
            onClick={() => props.onPageChange(page - 1)}
          >
            Назад
          </Button>
          <Button
            variant="secondary"
            disabled={props.loading || page >= pageCount}
            onClick={() => props.onPageChange(page + 1)}
          >
            Вперёд
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Дата</TableHead>
              <TableHead className="whitespace-nowrap">Категория</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead className="whitespace-nowrap text-right">Сумма</TableHead>
              <TableHead className="whitespace-nowrap">Валюта</TableHead>
              <TableHead className="whitespace-nowrap">Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.data?.rows?.length ? (
              props.data.rows.map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell className="whitespace-nowrap">
                    {r.operation_datetime?.replace("T", " ").slice(0, 19) ?? ""}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{r.category ?? ""}</TableCell>
                  <TableCell className="min-w-[360px]">{r.description ?? ""}</TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {typeof r.operation_amount === "number" ? fmt.format(r.operation_amount) : ""}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{r.operation_currency ?? ""}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.status ?? ""}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  {props.loading ? "Загрузка…" : "Нет данных под текущие фильтры"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

