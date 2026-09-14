"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { MoneyText } from "@/components/shared/money-text";
import { History } from "lucide-react";
import { useFinanceList } from "@/lib/query/hooks/use-finance";
import { usePurchases } from "@/lib/query/hooks/use-purchases";
import { useWriteOffs } from "@/lib/query/hooks/use-write-offs";
import { useTransfers } from "@/lib/query/hooks/use-transfers";
import { formatBusinessDate } from "@/lib/format/date";
import { formatQuantity } from "@/lib/format/decimal";

export default function HistoryPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">История</h1>
      <Tabs defaultValue="finance">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="finance">Касса</TabsTrigger>
          <TabsTrigger value="purchases">Закупки</TabsTrigger>
          <TabsTrigger value="write-offs">Списания</TabsTrigger>
          <TabsTrigger value="transfers">Перемещения</TabsTrigger>
        </TabsList>

        <TabsContent value="finance" className="mt-4">
          <FinanceHistory />
        </TabsContent>
        <TabsContent value="purchases" className="mt-4">
          <PurchasesHistory />
        </TabsContent>
        <TabsContent value="write-offs" className="mt-4">
          <WriteOffsHistory />
        </TabsContent>
        <TabsContent value="transfers" className="mt-4">
          <TransfersHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FinanceHistory() {
  const { data, isLoading, isError, error, refetch } = useFinanceList({ includeCancelled: true, pageSize: 50 });
  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!data || data.data.length === 0) return <EmptyState icon={History} title="Операций пока нет" />;
  return (
    <DataList>
      {data.data.map((tx) => (
        <Link key={tx.id} href={`/finance/${tx.id}`}>
          <DataListRow onClick={() => {}}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {tx.type}
                {tx.cancelledAt ? " (отменено)" : ""}
              </p>
              <p className="text-xs text-muted-foreground">{formatBusinessDate(tx.occurredAt)}</p>
            </div>
            <MoneyText value={tx.amount} currency={tx.currency} direction={tx.direction} />
          </DataListRow>
        </Link>
      ))}
    </DataList>
  );
}

function PurchasesHistory() {
  const { data, isLoading, isError, error, refetch } = usePurchases({ includeCancelled: true, pageSize: 50 });
  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!data || data.data.length === 0) return <EmptyState icon={History} title="Закупок пока нет" />;
  return (
    <DataList>
      {data.data.map((p) => (
        <Link key={p.id} href={`/purchases/${p.id}`}>
          <DataListRow onClick={() => {}}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.supplierNameSnapshot}</p>
              <p className="text-xs text-muted-foreground">{formatBusinessDate(p.occurredAt)}</p>
            </div>
            <MoneyText value={p.totalAmount} currency={p.currency} />
          </DataListRow>
        </Link>
      ))}
    </DataList>
  );
}

function WriteOffsHistory() {
  const { data, isLoading, isError, error, refetch } = useWriteOffs({ includeCancelled: true, pageSize: 50 });
  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!data || data.data.length === 0) return <EmptyState icon={History} title="Списаний пока нет" />;
  return (
    <DataList>
      {data.data.map((w) => (
        <Link key={w.id} href={`/write-offs/${w.id}`}>
          <DataListRow onClick={() => {}}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{w.materialNameSnapshot}</p>
              <p className="text-xs text-muted-foreground">{formatBusinessDate(w.occurredAt)}</p>
            </div>
            <span className="text-sm">{formatQuantity(w.quantity)}</span>
          </DataListRow>
        </Link>
      ))}
    </DataList>
  );
}

function TransfersHistory() {
  const { data, isLoading, isError, error, refetch } = useTransfers({ includeCancelled: true, pageSize: 50 });
  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;
  if (!data || data.data.length === 0) return <EmptyState icon={History} title="Перемещений пока нет" />;
  return (
    <DataList>
      {data.data.map((t) => (
        <Link key={t.id} href={`/transfers/${t.id}`}>
          <DataListRow onClick={() => {}}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.materialNameSnapshot}</p>
              <p className="text-xs text-muted-foreground">{formatBusinessDate(t.occurredAt)}</p>
            </div>
            <span className="text-sm">{formatQuantity(t.quantity)}</span>
          </DataListRow>
        </Link>
      ))}
    </DataList>
  );
}
