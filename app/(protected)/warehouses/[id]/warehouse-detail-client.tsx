"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Package, Archive, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { MoneyText } from "@/components/shared/money-text";
import { useWarehouse, useUpdateWarehouse, useInventoryBalances } from "@/lib/query/hooks/use-inventory";
import { formatQuantity } from "@/lib/format/decimal";
import { getErrorMessage } from "@/lib/errors/map";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";

export function WarehouseDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);
  const { data: warehouse, isLoading, isError, error, refetch } = useWarehouse(id);
  const { data: balances = [], isLoading: balancesLoading } = useInventoryBalances({ warehouseId: id });
  const updateMutation = useUpdateWarehouse();
  const [toggling, setToggling] = useState(false);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (isError || !warehouse) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="flex-1 truncate text-lg font-semibold">{warehouse.name}</h1>
        {!warehouse.isActive && <Badge variant="secondary">Архив</Badge>}
      </div>

      <p className="text-sm text-muted-foreground">Код: {warehouse.code}</p>
      {warehouse.comment && <p className="text-sm">{warehouse.comment}</p>}

      {canMutate && (
        <Button
          variant="outline"
          size="sm"
          disabled={toggling}
          onClick={() => {
            setToggling(true);
            updateMutation.mutate(
              { id, body: { isActive: !warehouse.isActive } },
              {
                onSuccess: () => toast.success(warehouse.isActive ? "Склад архивирован" : "Склад восстановлен"),
                onError: (err) => toast.error(getErrorMessage(err)),
                onSettled: () => setToggling(false),
              },
            );
          }}
        >
          {warehouse.isActive ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
          {warehouse.isActive ? "В архив" : "Восстановить"}
        </Button>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Остатки материалов</h2>
        {balancesLoading ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : balances.length === 0 ? (
          <EmptyState icon={Package} title="Остатков пока нет" />
        ) : (
          <DataList>
            {balances.map((b) => (
              <DataListRow key={b.id}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.materialName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatQuantity(b.quantity, b.unitSymbol)}
                    {b.lowStock && <span className="ml-2 text-warning">Низкий остаток</span>}
                  </p>
                </div>
                <div className="text-right">
                  <MoneyText value={b.valueUzs} currency="UZS" />
                  <p className="text-xs text-muted-foreground">
                    ~{formatQuantity(b.averageCostUzs)} / {b.unitSymbol}
                  </p>
                </div>
              </DataListRow>
            ))}
          </DataList>
        )}
      </div>
    </div>
  );
}
