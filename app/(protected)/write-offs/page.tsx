"use client";

import Link from "next/link";
import { ClipboardMinus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { MoneyText } from "@/components/shared/money-text";
import { PageHeader } from "@/components/shared/page-header";
import { useWriteOffs } from "@/lib/query/hooks/use-write-offs";
import { formatBusinessDate } from "@/lib/format/date";
import { formatQuantity } from "@/lib/format/decimal";

export default function WriteOffsPage() {
  const { data, isLoading, isError, error, refetch } = useWriteOffs({ pageSize: 50 });

  return (
    <div className="space-y-4">
      <PageHeader title="Списания" />

      {isLoading && <Skeleton className="h-64 w-full rounded-lg" />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState icon={ClipboardMinus} title="Списаний пока нет" />
      )}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <DataList>
          {data.data.map((w) => (
            <Link key={w.id} href={`/write-offs/${w.id}`}>
              <DataListRow onClick={() => {}}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{w.materialNameSnapshot}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {w.blockNameSnapshot} · {w.floorLabelSnapshot} · {formatBusinessDate(w.occurredAt)}
                    {w.cancelledAt ? " · отменено" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatQuantity(w.quantity)}</p>
                  <p className="text-xs text-muted-foreground">
                    <MoneyText value={w.totalCostUzs} currency="UZS" />
                  </p>
                </div>
              </DataListRow>
            </Link>
          ))}
        </DataList>
      )}
    </div>
  );
}
