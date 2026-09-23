"use client";

import { useMemo, useState } from "react";
import { Package, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useMaterials, useMaterialCategories } from "@/lib/query/hooks/use-inventory";
import { CreateMaterialDialog } from "@/components/shared/create-material-dialog";
import { useInventoryBalances } from "@/lib/query/hooks/use-inventory";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";

export default function MaterialsPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("ALL");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);

  const { data: categories = [] } = useMaterialCategories();
  const { data: materials, isLoading, isError, error, refetch } = useMaterials({
    categoryId: categoryId === "ALL" ? undefined : categoryId,
    search: search.trim() || undefined,
  });
  const { data: lowStockBalances = [] } = useInventoryBalances({ lowStock: true });
  const lowStockMaterialIds = useMemo(
    () => new Set(lowStockBalances.map((b) => b.materialId)),
    [lowStockBalances],
  );

  const filtered = (materials ?? []).filter((m) => !lowStockOnly || lowStockMaterialIds.has(m.id));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Материалы"
        actions={
          canMutate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Добавить
            </Button>
          )
        }
      />

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 pl-9"
            placeholder="Поиск по названию или коду"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-9 flex-1">
              <SelectValue placeholder="Все категории" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все категории</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={lowStockOnly ? "default" : "outline"}
            size="sm"
            className="h-9"
            onClick={() => setLowStockOnly((v) => !v)}
          >
            Низкий остаток
          </Button>
        </div>
      </div>

      {isLoading && <Skeleton className="h-64 w-full rounded-lg" />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState icon={Package} title="Материалы не найдены" />
      )}
      {!isLoading && !isError && filtered.length > 0 && (
        <DataList>
          {filtered.map((m) => (
            <DataListRow key={m.id}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.name}
                  {!m.isActive && <span className="ml-2 text-xs text-muted-foreground">(архив)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{m.code}</p>
              </div>
              {lowStockMaterialIds.has(m.id) && <Badge variant="destructive">Низкий остаток</Badge>}
            </DataListRow>
          ))}
        </DataList>
      )}

      <CreateMaterialDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
