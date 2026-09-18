"use client";

import { useMemo, useState } from "react";
import { Package, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { PageHeader } from "@/components/shared/page-header";
import {
  useMaterials,
  useMaterialCategories,
  useCreateMaterialCategory,
  useUnits,
  useCreateMaterial,
} from "@/lib/query/hooks/use-inventory";
import { useInventoryBalances } from "@/lib/query/hooks/use-inventory";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";
import { getErrorMessage } from "@/lib/errors/map";
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

      <CreateMaterialDialog open={createOpen} onOpenChange={setCreateOpen} categories={categories} />
    </div>
  );
}

function CreateMaterialDialog({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: string; name: string }[];
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [minimumStock, setMinimumStock] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  const { data: units = [] } = useUnits();
  const createMaterial = useCreateMaterial();
  const createCategory = useCreateMaterialCategory();

  const reset = () => {
    setName("");
    setCode("");
    setCategoryId("");
    setUnitId("");
    setMinimumStock("");
    setNewCategoryName("");
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Новый материал">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !code.trim() || !categoryId || !unitId) return;
          createMaterial.mutate(
            {
              name: name.trim(),
              code: code.trim(),
              categoryId,
              unitId,
              minimumStock: minimumStock.trim() || undefined,
            },
            {
              onSuccess: () => {
                toast.success("Материал добавлен");
                reset();
                onOpenChange(false);
              },
              onError: (err) => toast.error(getErrorMessage(err)),
            },
          );
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="material-name">Название</Label>
          <Input id="material-name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="material-code">Код (латиницей)</Label>
          <Input id="material-code" className="h-11" value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} placeholder="cement-m500" />
        </div>
        <div className="space-y-2">
          <Label id="material-category-label">Категория</Label>
          <div className="flex gap-2">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-11 flex-1" aria-labelledby="material-category-label">
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input
              className="h-9 flex-1"
              placeholder="Новая категория"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!newCategoryName.trim() || createCategory.isPending}
              onClick={() => {
                createCategory.mutate(
                  { name: newCategoryName.trim() },
                  {
                    onSuccess: (cat) => {
                      setCategoryId(cat.id);
                      setNewCategoryName("");
                    },
                    onError: (err) => toast.error(getErrorMessage(err)),
                  },
                );
              }}
            >
              Создать
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label id="material-unit-label">Единица измерения</Label>
          <Select value={unitId} onValueChange={setUnitId}>
            <SelectTrigger className="h-11 w-full" aria-labelledby="material-unit-label">
              <SelectValue placeholder="Выберите единицу" />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="material-min-stock">Минимальный остаток (необязательно)</Label>
          <Input
            id="material-min-stock"
            inputMode="decimal"
            className="h-11"
            value={minimumStock}
            onChange={(e) => setMinimumStock(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="h-11 w-full"
          disabled={!name.trim() || !code.trim() || !categoryId || !unitId || createMaterial.isPending}
        >
          {createMaterial.isPending ? "Сохранение…" : "Создать"}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
