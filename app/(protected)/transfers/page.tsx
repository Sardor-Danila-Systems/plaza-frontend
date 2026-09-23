"use client";

import Link from "next/link";
import { ArrowLeftRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useTransfers } from "@/lib/query/hooks/use-transfers";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";
import { formatBusinessDate } from "@/lib/format/date";
import { formatQuantity } from "@/lib/format/decimal";

export default function TransfersPage() {
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);
  const { data, isLoading, isError, error, refetch } = useTransfers({ pageSize: 50 });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Перемещения"
        actions={
          canMutate && (
            <Button asChild size="sm">
              <Link href="/transfers/new">
                <Plus className="size-4" />
                Перемещение
              </Link>
            </Button>
          )
        }
      />

      {isLoading && <Skeleton className="h-64 w-full rounded-lg" />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState icon={ArrowLeftRight} title="Перемещений пока нет" />
      )}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <DataList>
          {data.data.map((t) => (
            <Link key={t.id} href={`/transfers/${t.id}`}>
              <DataListRow onClick={() => {}}>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-4/10">
                  <ArrowLeftRight className="size-4 text-chart-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.materialNameSnapshot}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.sourceWarehouseNameSnapshot} → {t.destinationWarehouseNameSnapshot}
                    {t.cancelledAt ? " · отменено" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatQuantity(t.quantity)}</p>
                  <p className="text-xs text-muted-foreground">{formatBusinessDate(t.occurredAt)}</p>
                </div>
              </DataListRow>
            </Link>
          ))}
        </DataList>
      )}
    </div>
  );
}
