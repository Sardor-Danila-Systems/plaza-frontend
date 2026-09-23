"use client";

import { useState } from "react";
import Link from "next/link";
import { Warehouse as WarehouseIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useWarehouses } from "@/lib/query/hooks/use-inventory";
import { CreateWarehouseDialog } from "@/components/shared/create-warehouse-dialog";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";

export default function WarehousesPage() {
  const { data, isLoading, isError, error, refetch } = useWarehouses();
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Склады"
        actions={
          canMutate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Добавить
            </Button>
          )
        }
      />

      {isLoading && <Skeleton className="h-64 w-full rounded-lg" />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState icon={WarehouseIcon} title="Складов пока нет" />
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <DataList>
          {data.map((w) => (
            <Link key={w.id} href={`/warehouses/${w.id}`}>
              <DataListRow onClick={() => {}}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {w.name}
                    {!w.isActive && <span className="ml-2 text-xs text-muted-foreground">(архив)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{w.code}</p>
                </div>
              </DataListRow>
            </Link>
          ))}
        </DataList>
      )}

      <CreateWarehouseDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
