"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { MoneyText } from "@/components/shared/money-text";
import { CombinedCashCard } from "@/components/shared/combined-cash-card";
import { useFinanceBalance, useFinanceList } from "@/lib/query/hooks/use-finance";
import { formatBusinessDate } from "@/lib/format/date";
import type { FinancialTransactionType } from "@/lib/api/types";

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Доход",
  EXPENSE: "Расход",
  SALARY: "Зарплата",
  PURCHASE: "Закупка",
  ADVANCE: "Аванс",
  DEBT_PAYMENT: "Оплата долга",
  REFUND: "Возврат",
  ADJUSTMENT: "Корректировка",
};

export default function FinancePage() {
  const [type, setType] = useState<string>("ALL");
  const { data: balance, isLoading: balanceLoading } = useFinanceBalance();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useFinanceList({
    type: type === "ALL" ? undefined : (type as FinancialTransactionType),
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Касса</h1>
      </div>

      <CombinedCashCard />

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Сум</CardTitle>
            <Wallet className="size-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl font-semibold tabular-nums">
                <MoneyText value={balance?.uzs ?? "0"} currency="UZS" />
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">USD</CardTitle>
            <Wallet className="size-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl font-semibold tabular-nums">
                <MoneyText value={balance?.usd ?? "0"} currency="USD" />
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Все типы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все типы</SelectItem>
            <SelectItem value="INCOME">Доход</SelectItem>
            <SelectItem value="EXPENSE">Расход</SelectItem>
            <SelectItem value="SALARY">Зарплата</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <Skeleton className="h-64 w-full rounded-lg" />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState icon={Wallet} title="Операций пока нет" description="Добавьте первую операцию через кнопку «+»" />
      )}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <DataList>
          {data.data.map((tx) => (
            <Link key={tx.id} href={`/finance/${tx.id}`}>
              <DataListRow onClick={() => {}}>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  {tx.direction === "IN" ? (
                    <ArrowDownCircle className="size-4 text-success" />
                  ) : (
                    <ArrowUpCircle className="size-4 text-destructive" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {TYPE_LABELS[tx.type] ?? tx.type}
                    {tx.categoryNameSnapshot ? ` · ${tx.categoryNameSnapshot}` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatBusinessDate(tx.occurredAt)}
                    {tx.recipient ? ` · ${tx.recipient}` : ""}
                    {tx.cancelledAt ? " · отменено" : ""}
                  </p>
                </div>
                <MoneyText value={tx.amount} currency={tx.currency} direction={tx.direction} />
              </DataListRow>
            </Link>
          ))}
        </DataList>
      )}
    </div>
  );
}
