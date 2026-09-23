"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import {
  useCreateMaterial,
  useCreateMaterialCategory,
  useMaterialCategories,
  useUnits,
} from "@/lib/query/hooks/use-inventory";
import { getErrorMessage } from "@/lib/errors/map";
import { normalizeCodeInput, slugify } from "@/lib/format/slug";
import type { Material } from "@/lib/api/types";

/** Shared between the materials list and the purchase form — see
 * CreateSupplierDialog for why `onCreated` exists. Categories and units are
 * fetched here rather than passed in so any caller can mount it directly. */
export function CreateMaterialDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (material: Material) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeEdited, setCodeEdited] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [minimumStock, setMinimumStock] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  const { data: categories = [] } = useMaterialCategories();
  const { data: units = [] } = useUnits();
  const createMaterial = useCreateMaterial();
  const createCategory = useCreateMaterialCategory();

  const reset = () => {
    setName("");
    setCode("");
    setCodeEdited(false);
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
              onSuccess: (material) => {
                toast.success("Материал добавлен");
                reset();
                onOpenChange(false);
                onCreated?.(material);
              },
              onError: (err) => toast.error(getErrorMessage(err)),
            },
          );
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="material-name">Название</Label>
          <Input
            id="material-name"
            className="h-11"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!codeEdited) setCode(slugify(e.target.value));
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="material-code">Код (латиницей)</Label>
          <Input
            id="material-code"
            className="h-11"
            value={code}
            onChange={(e) => {
              setCodeEdited(true);
              setCode(normalizeCodeInput(e.target.value));
            }}
            placeholder="cement-m500"
          />
        </div>
        <div className="space-y-2">
          <Label id="material-category-label">Категория</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-11 w-full" aria-labelledby="material-category-label">
              <SelectValue placeholder={categories.length ? "Выберите категорию" : "Категорий ещё нет"} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              className="h-9 flex-1"
              placeholder="Новая категория"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                // Enter inside this helper field would otherwise submit the
                // outer material form with an empty category.
                if (e.key === "Enter") e.preventDefault();
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              disabled={!newCategoryName.trim() || createCategory.isPending}
              onClick={() => {
                createCategory.mutate(
                  { name: newCategoryName.trim() },
                  {
                    onSuccess: (cat) => {
                      setCategoryId(cat.id);
                      setNewCategoryName("");
                      toast.success("Категория создана");
                    },
                    onError: (err) => toast.error(getErrorMessage(err)),
                  },
                );
              }}
            >
              {createCategory.isPending ? "…" : "Создать"}
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
          <DecimalInput
            id="material-min-stock"
            scale={6}
            className="h-11"
            value={minimumStock}
            onValueChange={setMinimumStock}
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
