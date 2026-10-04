"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, Banknote, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat, StatRow } from "@/components/shared/stat-row";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { MoneyText } from "@/components/shared/money-text";
import { PageHeader } from "@/components/shared/page-header";
import { useFinanceBalance, useFinanceList } from "@/lib/query/hooks/use-finance";
import { useAuth } from "@/lib/auth/auth-provider";
import { canPostCash } from "@/lib/auth/permissions";
import { formatBusinessDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/decimal";
import { CASH_ACCOUNTS, CASH_ACCOUNT_LABELS } from "@/lib/api/types";
import type { CashAccount, FinancialTransactionType } from "@/lib/api/types";

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
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = canPostCash(user?.role);
  const [type, setType] = useState<string>("ALL");
  const [account, setAccount] = useState<string>("ALL");
  const { data: balance, isLoading: balanceLoading } = useFinanceBalance();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useFinanceList({
    type: type === "ALL" ? undefined : (type as FinancialTransactionType),
    account: account === "ALL" ? undefined : (account as CashAccount),
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Касса"
        actions={
          canMutate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="size-4" />
                  Новая операция
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => router.push("/finance/new?type=INCOME")}>
                  <ArrowDownCircle className="size-4" />
                  Доход
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push("/finance/new?type=EXPENSE")}>
                  <ArrowUpCircle className="size-4" />
                  Расход
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push("/finance/new?type=SALARY")}>
                  <Banknote className="size-4" />
                  Зарплата
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />

      {/* The project runs two cash accounts; money in one cannot pay from the
        * other, so each balance is shown on its own next to their total. */}
      <StatRow className="sm:grid-cols-3">
        <Stat
          label="Всего"
          isLoading={balanceLoading}
          value={formatMoney(balance?.uzs ?? "0", "UZS")}
          className="col-span-2 sm:col-span-1"
        />
        {CASH_ACCOUNTS.map((acc) => (
          <Stat
            key={acc}
            label={CASH_ACCOUNT_LABELS[acc]}
            isLoading={balanceLoading}
            value={formatMoney(balance?.byAccount.find((b) => b.account === acc)?.uzs ?? "0", "UZS")}
          />
        ))}
      </StatRow>

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
        <Select value={account} onValueChange={setAccount}>
          <SelectTrigger className="h-9 w-44" aria-label="Касса">
            <SelectValue placeholder="Все кассы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все кассы</SelectItem>
            {CASH_ACCOUNTS.map((acc) => (
              <SelectItem key={acc} value={acc}>
                {CASH_ACCOUNT_LABELS[acc]}
              </SelectItem>
            ))}
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
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                    tx.direction === "IN" ? "bg-success/10" : "bg-destructive/10"
                  }`}
                >
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
                    {` · ${CASH_ACCOUNT_LABELS[tx.account]}`}
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
