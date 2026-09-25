"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useSuppliers } from "@/lib/query/hooks/use-suppliers";
import { CreateSupplierDialog } from "@/components/shared/create-supplier-dialog";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  // The server does the matching (name, contact person, phone, ИНН), so the
  // query is debounced rather than fired on every keystroke.
  const debouncedSearch = useDebouncedValue(search.trim());
  const { data, isLoading, isError, error, refetch } = useSuppliers({
    search: debouncedSearch || undefined,
  });
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);
  const [createOpen, setCreateOpen] = useState(false);

  const isSearching = debouncedSearch.length > 0;

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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 pl-9"
          placeholder="Поиск по названию, контакту, телефону или ИНН"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Поиск поставщиков"
        />
      </div>

      {isLoading && <Skeleton className="h-64 w-full rounded-lg" />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState
          icon={Users}
          title={isSearching ? "Поставщики не найдены" : "Поставщиков пока нет"}
          description={isSearching ? `По запросу «${debouncedSearch}» ничего нет` : undefined}
        />
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
                  {(s.contactPerson || s.taxId) && (
                    <p className="truncate text-xs text-muted-foreground">
                      {[s.contactPerson, s.taxId && `ИНН ${s.taxId}`].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                {s.phone && <p className="shrink-0 text-xs text-muted-foreground">{s.phone}</p>}
              </DataListRow>
            </Link>
          ))}
        </DataList>
      )}

      <CreateSupplierDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
