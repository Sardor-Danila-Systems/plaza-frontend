"use client";

import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { MoneyText } from "@/components/shared/money-text";
import { PageHeader } from "@/components/shared/page-header";
import { PurchaseStatusBadge } from "@/components/shared/status-badge";
import { usePurchases } from "@/lib/query/hooks/use-purchases";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";
import { formatBusinessDate } from "@/lib/format/date";

export default function PurchasesPage() {
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);
  const { data, isLoading, isError, error, refetch } = usePurchases({ pageSize: 50 });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Закупки"
        actions={
          canMutate && (
            <Button asChild size="sm">
              <Link href="/purchases/new">
                <Plus className="size-4" />
                Закупка
              </Link>
            </Button>
          )
        }
      />

      {isLoading && <Skeleton className="h-64 w-full rounded-lg" />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState icon={ShoppingCart} title="Закупок пока нет" />
      )}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <DataList>
          {data.data.map((p) => (
            <Link key={p.id} href={`/purchases/${p.id}`}>
              <DataListRow onClick={() => {}}>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gold/10">
                  <ShoppingCart className="size-4 text-gold" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.supplierNameSnapshot}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.warehouseNameSnapshot} · {formatBusinessDate(p.occurredAt)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <MoneyText value={p.totalAmount} currency={p.currency} />
                  <PurchaseStatusBadge status={p.status} />
                </div>
              </DataListRow>
            </Link>
          ))}
        </DataList>
      )}
    </div>
  );
}
