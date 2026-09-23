"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWarehouses, useInventoryBalances } from "@/lib/query/hooks/use-inventory";
import { useBlocks, useFloors } from "@/lib/query/hooks/use-construction";
import { useCreateWriteOff } from "@/lib/query/hooks/use-write-offs";
import { useIdempotencyKey } from "@/lib/idempotency";
import { getErrorMessage } from "@/lib/errors/map";
import { todayBusinessDate } from "@/lib/format/date";
import { formatQuantity, isPositiveDecimalString } from "@/lib/format/decimal";
import Decimal from "decimal.js";

export default function NewWriteOffPage() {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [comment, setComment] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayBusinessDate());
  const [formError, setFormError] = useState<string | null>(null);

  const { data: warehouses = [] } = useWarehouses();
  const { data: balances = [] } = useInventoryBalances({ warehouseId: warehouseId || undefined });
  const { data: blocks = [] } = useBlocks();
  const { data: floors = [] } = useFloors(blockId || null);

  const createMutation = useCreateWriteOff();
  const { key, renew } = useIdempotencyKey();

  const availableMaterials = balances.filter((b) => new Decimal(b.quantity).greaterThan(0));
  const selectedBalance = balances.find((b) => b.materialId === materialId);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!warehouseId || !materialId || !blockId || !floorId) {
      setFormError("Заполните все обязательные поля");
      return;
    }
    if (!isPositiveDecimalString(quantity)) {
      setFormError("Введите корректное количество");
      return;
    }
    if (selectedBalance && new Decimal(quantity).greaterThan(selectedBalance.quantity)) {
      setFormError("Количество превышает остаток на складе");
      return;
    }

    createMutation.mutate(
      {
        body: { warehouseId, materialId, blockId, floorId, quantity, comment: comment.trim() || undefined, occurredAt },
        idempotencyKey: key,
      },
      {
        onSuccess: (writeOff) => {
          renew();
          toast.success("Списание оформлено");
          router.replace(`/write-offs/${writeOff.id}`);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold">Новое списание</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <div className="space-y-2">
          <Label id="writeoff-warehouse-label">Склад</Label>
          <Select
            value={warehouseId}
            onValueChange={(v) => {
              setWarehouseId(v);
              setMaterialId("");
            }}
          >
            <SelectTrigger className="h-11 w-full" aria-labelledby="writeoff-warehouse-label">
              <SelectValue placeholder="Выберите склад" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label id="writeoff-material-label">Материал</Label>
          <Select value={materialId} onValueChange={setMaterialId} disabled={!warehouseId}>
            <SelectTrigger className="h-11 w-full" aria-labelledby="writeoff-material-label">
              <SelectValue placeholder={warehouseId ? "Выберите материал" : "Сначала выберите склад"} />
            </SelectTrigger>
            <SelectContent>
              {availableMaterials.map((b) => (
                <SelectItem key={b.materialId} value={b.materialId}>
                  {b.materialName} — {formatQuantity(b.quantity, b.unitSymbol)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="writeoff-quantity">Количество{selectedBalance ? ` (доступно: ${formatQuantity(selectedBalance.quantity, selectedBalance.unitSymbol)})` : ""}</Label>
          <DecimalInput
            id="writeoff-quantity"
            scale={6}
            className="h-11"
            value={quantity}
            onValueChange={setQuantity}
            disabled={!materialId}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label id="writeoff-block-label">Блок</Label>
            <Select
              value={blockId}
              onValueChange={(v) => {
                setBlockId(v);
                setFloorId("");
              }}
            >
              <SelectTrigger className="h-11 w-full" aria-labelledby="writeoff-block-label">
                <SelectValue placeholder="Выберите блок" />
              </SelectTrigger>
              <SelectContent>
                {blocks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label id="writeoff-floor-label">Этаж</Label>
            <Select value={floorId} onValueChange={setFloorId} disabled={!blockId}>
              <SelectTrigger className="h-11 w-full" aria-labelledby="writeoff-floor-label">
                <SelectValue placeholder="Выберите этаж" />
              </SelectTrigger>
              <SelectContent>
                {floors.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="writeoff-date">Дата</Label>
          <Input
            id="writeoff-date"
            type="date"
            className="h-11"
            value={occurredAt}
            max={todayBusinessDate()}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="writeoff-comment">Комментарий</Label>
          <Textarea id="writeoff-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>

        <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:px-0 md:py-0">
          <Button type="submit" className="h-11 w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Сохранение…" : "Оформить списание"}
          </Button>
        </div>
      </form>
    </div>
  );
}
