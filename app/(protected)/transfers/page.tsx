"use client";

import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useTransfers } from "@/lib/query/hooks/use-transfers";
import { formatBusinessDate } from "@/lib/format/date";
import { formatQuantity } from "@/lib/format/decimal";

export default function TransfersPage() {
  const { data, isLoading, isError, error, refetch } = useTransfers({ pageSize: 50 });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Перемещения</h1>

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
