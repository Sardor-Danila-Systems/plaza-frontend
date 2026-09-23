"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useSuppliers } from "@/lib/query/hooks/use-suppliers";
import { CreateSupplierDialog } from "@/components/shared/create-supplier-dialog";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";

export default function SuppliersPage() {
  const { data, isLoading, isError, error, refetch } = useSuppliers();
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Поставщики"
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
        <EmptyState icon={Users} title="Поставщиков пока нет" />
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <DataList>
          {data.map((s) => (
            <Link key={s.id} href={`/suppliers/${s.id}`}>
              <DataListRow onClick={() => {}}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {s.name}
                    {!s.isActive && <span className="ml-2 text-xs text-muted-foreground">(архив)</span>}
                  </p>
                  {s.contactPerson && (
                    <p className="truncate text-xs text-muted-foreground">{s.contactPerson}</p>
                  )}
                </div>
                {s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}
              </DataListRow>
            </Link>
          ))}
        </DataList>
      )}

      <CreateSupplierDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
