"use client";

import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  Building2,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Stat, StatRow } from "@/components/shared/stat-row";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { MoneyText } from "@/components/shared/money-text";
import { useFinanceBalance, useFinanceList } from "@/lib/query/hooks/use-finance";
import { useInventoryBalances } from "@/lib/query/hooks/use-inventory";
import { useAnalyticsSummary } from "@/lib/query/hooks/use-analytics";
import { useBlocks } from "@/lib/query/hooks/use-construction";
import { formatMoney } from "@/lib/format/decimal";
import { formatBusinessDate } from "@/lib/format/date";
import { useProject } from "@/lib/project/project-context";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";
import { QUICK_ACTIONS, QUICK_ACTION_TONE_CLASSES } from "@/lib/nav/config";

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

export default function DashboardPage() {
  const { project } = useProject();
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);

  const { data: balance, isLoading: balanceLoading } = useFinanceBalance();
  const { data: lowStock, isLoading: lowStockLoading } = useInventoryBalances({ lowStock: true });
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary({});
  const { data: recent, isLoading: recentLoading } = useFinanceList({ pageSize: 6 });
  const { data: blocks, isLoading: blocksLoading } = useBlocks();

  const supplierDebt = summary?.supplierDebtAsOf ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={project?.name ?? "—"}
        subtitle="Обзор проекта"
        actions={
          canMutate && (
            <Button asChild className="h-9 gap-1.5">
              <Link href="/finance/new?type=INCOME">
                <Plus className="size-4" />
                Новая операция
              </Link>
            </Button>
          )
        }
      />

      <StatRow>
        <Stat label="Касса, сум" isLoading={balanceLoading} value={formatMoney(balance?.uzs ?? "0", "UZS")} />
        <Stat label="Касса, USD" isLoading={balanceLoading} value={formatMoney(balance?.usd ?? "0", "USD")} />
        <Stat
          label="Долг поставщикам"
          isLoading={summaryLoading}
          value={
            supplierDebt.length ? supplierDebt.map((d) => formatMoney(d.amount, d.currency)).join(" · ") : "Нет"
          }
          tone={supplierDebt.length ? "warning" : "default"}
        />
        <Stat
          label="Низкий остаток"
          isLoading={lowStockLoading}
          value={lowStock?.length ?? 0}
          tone={(lowStock?.length ?? 0) > 0 ? "warning" : "default"}
        />
      </StatRow>

      {canMutate && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            Быстрые действия
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {QUICK_ACTIONS.map((action) => {
              const tone = QUICK_ACTION_TONE_CLASSES[action.tone];
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-3.5 text-center transition-colors hover:bg-muted/60"
                >
                  <span className={`flex size-8 items-center justify-center rounded-full ${tone.bg}`}>
                    <action.icon className={`size-4 ${tone.icon}`} />
                  </span>
                  <span className="text-xs font-medium">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Последние операции
            </p>
            <Link href="/finance" className="text-xs text-muted-foreground hover:text-foreground">
              Все операции →
            </Link>
          </div>
          {recentLoading && <div className="h-40 animate-pulse rounded-lg border border-border bg-muted/30" />}
          {!recentLoading && (!recent || recent.data.length === 0) && (
            <EmptyState icon={ArrowDownCircle} title="Операций пока нет" />
          )}
          {!recentLoading && recent && recent.data.length > 0 && (
            <DataList>
              {recent.data.map((tx) => (
                <Link key={tx.id} href={`/finance/${tx.id}`}>
                  <DataListRow onClick={() => {}}>
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
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
                      <p className="truncate text-xs text-muted-foreground">{formatBusinessDate(tx.occurredAt)}</p>
                    </div>
                    <MoneyText value={tx.amount} currency={tx.currency} direction={tx.direction} />
                  </DataListRow>
                </Link>
              ))}
            </DataList>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Требует внимания
            </p>
            <Link href="/warehouses" className="text-xs text-muted-foreground hover:text-foreground">
              Склады →
            </Link>
          </div>
          {lowStockLoading && <div className="h-40 animate-pulse rounded-lg border border-border bg-muted/30" />}
          {!lowStockLoading && (!lowStock || lowStock.length === 0) && (
            <EmptyState icon={AlertTriangle} title="Низких остатков нет" description="Все материалы в норме" />
          )}
          {!lowStockLoading && lowStock && lowStock.length > 0 && (
            <DataList>
              {lowStock.slice(0, 6).map((item) => (
                <DataListRow key={item.id}>
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning/15">
                    <AlertTriangle className="size-4 text-warning-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.materialName}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.warehouseName}</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {item.quantity} {item.unitSymbol}
                  </span>
                </DataListRow>
              ))}
            </DataList>
          )}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">Объекты</p>
          <Link href="/settings/construction" className="text-xs text-muted-foreground hover:text-foreground">
            Все объекты →
          </Link>
        </div>
        {blocksLoading && <div className="h-16 animate-pulse rounded-lg border border-border bg-muted/30" />}
        {!blocksLoading && (!blocks || blocks.length === 0) && (
          <EmptyState icon={Building2} title="Объекты ещё не добавлены" />
        )}
        {!blocksLoading && blocks && blocks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {blocks.map((block) => (
              <Link key={block.id} href="/settings/construction">
                <Badge variant="outline" className="h-7 gap-1.5 px-2.5 text-xs font-medium">
                  <Building2 className="size-3" />
                  {block.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
