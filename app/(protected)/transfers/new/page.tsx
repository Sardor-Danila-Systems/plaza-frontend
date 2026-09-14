"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Decimal from "decimal.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWarehouses, useInventoryBalances } from "@/lib/query/hooks/use-inventory";
import { useCreateTransfer } from "@/lib/query/hooks/use-transfers";
import { useIdempotencyKey } from "@/lib/idempotency";
import { getErrorMessage } from "@/lib/errors/map";
import { todayBusinessDate } from "@/lib/format/date";
import { formatQuantity, isPositiveDecimalString } from "@/lib/format/decimal";

export default function NewTransferPage() {
  const router = useRouter();
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [comment, setComment] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayBusinessDate());
  const [formError, setFormError] = useState<string | null>(null);

  const { data: warehouses = [] } = useWarehouses();
  const { data: balances = [] } = useInventoryBalances({
    warehouseId: sourceWarehouseId || undefined,
  });
  const createMutation = useCreateTransfer();
  const { key, renew } = useIdempotencyKey();

  const availableMaterials = balances.filter((b) => new Decimal(b.quantity).greaterThan(0));
  const selectedBalance = balances.find((b) => b.materialId === materialId);
  const destinationOptions = warehouses.filter((w) => w.id !== sourceWarehouseId);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!sourceWarehouseId || !destinationWarehouseId || !materialId) {
      setFormError("Заполните все обязательные поля");
      return;
    }
    if (sourceWarehouseId === destinationWarehouseId) {
      setFormError("Склад отправления и назначения не должны совпадать");
      return;
    }
    if (!isPositiveDecimalString(quantity)) {
      setFormError("Введите корректное количество");
      return;
    }
    if (selectedBalance && new Decimal(quantity).greaterThan(selectedBalance.quantity)) {
      setFormError("Количество превышает остаток на складе-отправителе");
      return;
    }

    createMutation.mutate(
      {
        body: {
          sourceWarehouseId,
          destinationWarehouseId,
          materialId,
          quantity,
          comment: comment.trim() || undefined,
          occurredAt,
        },
        idempotencyKey: key,
      },
      {
        onSuccess: (transfer) => {
          renew();
          toast.success("Перемещение оформлено");
          router.replace(`/transfers/${transfer.id}`);
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
        <h1 className="text-lg font-semibold">Новое перемещение</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <div className="space-y-2">
          <Label id="source-warehouse-label">Склад-отправитель</Label>
          <Select
            value={sourceWarehouseId}
            onValueChange={(v) => {
              setSourceWarehouseId(v);
              setMaterialId("");
              if (v === destinationWarehouseId) setDestinationWarehouseId("");
            }}
          >
            <SelectTrigger className="h-11 w-full" aria-labelledby="source-warehouse-label">
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
          <Label id="destination-warehouse-label">Склад-получатель</Label>
          <Select value={destinationWarehouseId} onValueChange={setDestinationWarehouseId} disabled={!sourceWarehouseId}>
            <SelectTrigger className="h-11 w-full" aria-labelledby="destination-warehouse-label">
              <SelectValue placeholder="Выберите склад" />
            </SelectTrigger>
            <SelectContent>
              {destinationOptions.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label id="transfer-material-label">Материал</Label>
          <Select value={materialId} onValueChange={setMaterialId} disabled={!sourceWarehouseId}>
            <SelectTrigger className="h-11 w-full" aria-labelledby="transfer-material-label">
              <SelectValue placeholder={sourceWarehouseId ? "Выберите материал" : "Сначала выберите склад"} />
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
          <Label htmlFor="transfer-quantity">
            Количество
            {selectedBalance ? ` (доступно: ${formatQuantity(selectedBalance.quantity, selectedBalance.unitSymbol)})` : ""}
          </Label>
          <Input
            id="transfer-quantity"
            inputMode="decimal"
            className="h-11"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={!materialId}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transfer-date">Дата</Label>
          <Input
            id="transfer-date"
            type="date"
            className="h-11"
            value={occurredAt}
            max={todayBusinessDate()}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="transfer-comment">Комментарий</Label>
          <Textarea id="transfer-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>

        <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:px-0 md:py-0">
          <Button type="submit" className="h-11 w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Сохранение…" : "Оформить перемещение"}
          </Button>
        </div>
      </form>
    </div>
  );
}
