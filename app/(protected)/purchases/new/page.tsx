"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecimalInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSuppliers, useSupplierAdvances } from "@/lib/query/hooks/use-suppliers";
import { useWarehouses, useMaterials } from "@/lib/query/hooks/use-inventory";
import { useCreatePurchase } from "@/lib/query/hooks/use-purchases";
import { CreateSupplierDialog } from "@/components/shared/create-supplier-dialog";
import { CreateWarehouseDialog } from "@/components/shared/create-warehouse-dialog";
import { CreateMaterialDialog } from "@/components/shared/create-material-dialog";
import { useIdempotencyKey } from "@/lib/idempotency";
import { getErrorMessage } from "@/lib/errors/map";
import { todayBusinessDate } from "@/lib/format/date";
import { formatMoney, isPositiveDecimalString, previewMultiply, previewSum } from "@/lib/format/decimal";
import type { AdvanceAllocationInput, CashAccount, Currency, PurchaseItemInput } from "@/lib/api/types";
import { CurrencySelect, RateFields, useRateForm } from "@/components/shared/currency-rate-fields";
import { CashAccountPicker } from "@/components/shared/cash-account-picker";

interface ItemRow extends PurchaseItemInput {
  key: string;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [currency, setCurrency] = useState<Currency>("UZS");
  const rate = useRateForm();
  const [items, setItems] = useState<ItemRow[]>([
    { key: crypto.randomUUID(), materialId: "", quantity: "", unitPrice: "" },
  ]);
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState<string[]>([]);
  const [advanceAmounts, setAdvanceAmounts] = useState<Record<string, string>>({});
  const [advanceSettlementRates, setAdvanceSettlementRates] = useState<Record<string, string>>({});
  const [cashPaid, setCashPaid] = useState("");
  const [cashAccount, setCashAccount] = useState<CashAccount>("CASH");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [comment, setComment] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayBusinessDate());
  const [formError, setFormError] = useState<string | null>(null);
  // A purchase is frequently the moment a supplier/warehouse/material is
  // first entered at all; creating one from here keeps a half-filled form
  // alive instead of losing it to a trip through another section.
  const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
  const [createWarehouseOpen, setCreateWarehouseOpen] = useState(false);
  const [createMaterialOpen, setCreateMaterialOpen] = useState(false);

  const { data: suppliers = [] } = useSuppliers();
  const { data: warehouses = [] } = useWarehouses();
  const { data: materials = [] } = useMaterials({ isActive: true });
  const { data: supplierAdvances = [] } = useSupplierAdvances(supplierId);
  const createMutation = useCreatePurchase();
  const { key, renew } = useIdempotencyKey();

  const usableAdvances = supplierAdvances.filter((a) => Number(a.availableAmount) > 0);

  const previewTotal = previewSum(
    items.map((i) => previewMultiply(i.quantity || "0", i.unitPrice || "0")),
  );

  /** Drops a just-created material into the first still-empty row, or adds
   * a row for it — so "create material" lands where the user was typing. */
  const assignMaterialToRow = (materialId: string) =>
    setItems((rows) => {
      const target = rows.find((r) => !r.materialId);
      if (target) return rows.map((r) => (r === target ? { ...r, materialId } : r));
      return [...rows, { key: crypto.randomUUID(), materialId, quantity: "", unitPrice: "" }];
    });

  const addItem = () =>
    setItems((rows) => [...rows, { key: crypto.randomUUID(), materialId: "", quantity: "", unitPrice: "" }]);
  const removeItem = (rowKey: string) => setItems((rows) => rows.filter((r) => r.key !== rowKey));
  const updateItem = (rowKey: string, patch: Partial<ItemRow>) =>
    setItems((rows) => rows.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)));

  const toggleAdvance = (advanceId: string) => {
    setSelectedAdvanceIds((ids) =>
      ids.includes(advanceId) ? ids.filter((id) => id !== advanceId) : [...ids, advanceId],
    );
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!supplierId || !warehouseId) {
      setFormError("Выберите поставщика и склад");
      return;
    }
    if (items.length === 0 || items.some((i) => !i.materialId || !isPositiveDecimalString(i.quantity) || !isPositiveDecimalString(i.unitPrice))) {
      setFormError("Заполните все строки материалов корректно");
      return;
    }

    const rateError = rate.validate(currency);
    if (rateError) {
      setFormError(rateError);
      return;
    }

    const advanceAllocations: AdvanceAllocationInput[] = [];
    for (const advanceId of selectedAdvanceIds) {
      const amount = advanceAmounts[advanceId];
      if (!isPositiveDecimalString(amount ?? "")) {
        setFormError("Укажите сумму для каждого выбранного аванса");
        return;
      }
      const advance = usableAdvances.find((a) => a.id === advanceId)!;
      const needsRate = advance.currency !== currency && currency !== "UZS";
      if (needsRate && !advanceSettlementRates[advanceId]) {
        setFormError("Укажите курс пересчёта для аванса в другой валюте");
        return;
      }
      advanceAllocations.push({
        advanceId,
        amount,
        ...(needsRate ? { settlementExchangeRate: advanceSettlementRates[advanceId] } : {}),
      });
    }

    createMutation.mutate(
      {
        body: {
          supplierId,
          warehouseId,
          currency,
          ...rate.body(currency),
          ...(cashPaid.trim() ? { account: cashAccount } : {}),
          items: items.map(({ materialId, quantity, unitPrice }) => ({ materialId, quantity, unitPrice })),
          advanceAllocations: advanceAllocations.length > 0 ? advanceAllocations : undefined,
          cashPaid: cashPaid.trim() || undefined,
          invoiceNumber: invoiceNumber.trim() || undefined,
          comment: comment.trim() || undefined,
          occurredAt,
        },
        idempotencyKey: key,
      },
      {
        onSuccess: (purchase) => {
          renew();
          toast.success("Закупка оформлена");
          router.replace(`/purchases/${purchase.id}`);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold">Новая закупка</h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label id="purchase-supplier-label">Поставщик</Label>
            <div className="flex gap-2">
              <Select
                value={supplierId}
                onValueChange={(v) => {
                  setSupplierId(v);
                  setSelectedAdvanceIds([]);
                }}
              >
                <SelectTrigger className="h-11 flex-1" aria-labelledby="purchase-supplier-label">
                  <SelectValue placeholder="Выберите поставщика" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                aria-label="Новый поставщик"
                title="Новый поставщик"
                onClick={() => setCreateSupplierOpen(true)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label id="purchase-warehouse-label">Склад поступления</Label>
            <div className="flex gap-2">
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger className="h-11 flex-1" aria-labelledby="purchase-warehouse-label">
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
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 shrink-0"
                aria-label="Новый склад"
                title="Новый склад"
                onClick={() => setCreateWarehouseOpen(true)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label id="purchase-currency-label">Валюта</Label>
          <CurrencySelect value={currency} onChange={setCurrency} className="h-11 w-32" />
        </div>

        {currency === "USD" && <RateFields form={rate} />}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label id="purchase-materials-label">Материалы</Label>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateMaterialOpen(true)}>
                <Plus className="size-3.5" />
                Новый материал
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="size-3.5" />
                Строка
              </Button>
            </div>
          </div>
          {items.map((row) => (
            <div key={row.key} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <Select
                  value={row.materialId}
                  onValueChange={(v) => updateItem(row.key, { materialId: v })}
                >
                  <SelectTrigger className="h-11 flex-1" aria-labelledby="purchase-materials-label">
                    <SelectValue placeholder="Материал" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(row.key)} aria-label="Удалить строку">
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <DecimalInput
                  aria-label="Количество"
                  scale={6}
                  placeholder="Количество"
                  className="h-11"
                  value={row.quantity}
                  onValueChange={(v) => updateItem(row.key, { quantity: v })}
                />
                <DecimalInput
                  aria-label="Цена за единицу"
                  scale={8}
                  placeholder="Цена за ед."
                  className="h-11"
                  value={row.unitPrice}
                  onValueChange={(v) => updateItem(row.key, { unitPrice: v })}
                />
              </div>
              {row.quantity && row.unitPrice && (
                <p className="text-right text-xs text-muted-foreground">
                  {formatMoney(previewMultiply(row.quantity, row.unitPrice), currency)}
                </p>
              )}
            </div>
          ))}
          <p className="text-right text-sm font-medium">
            Предварительный итог: {formatMoney(previewTotal, currency)}
          </p>
        </div>

        {supplierId && usableAdvances.length > 0 && (
          <div className="space-y-2 rounded-lg border p-3">
            <Label>Использовать аванс поставщика</Label>
            {usableAdvances.map((advance) => {
              const checked = selectedAdvanceIds.includes(advance.id);
              const needsRate = advance.currency !== currency && currency !== "UZS";
              return (
                <div key={advance.id} className="space-y-2 rounded-md bg-muted/40 p-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAdvance(advance.id)}
                    />
                    Аванс {formatMoney(advance.availableAmount, advance.currency)} доступно
                  </label>
                  {checked && (
                    <div className="space-y-2 pl-6">
                      <DecimalInput
                        scale={2}
                        placeholder="Сумма к использованию"
                        className="h-10"
                        value={advanceAmounts[advance.id] ?? ""}
                        onValueChange={(v) => setAdvanceAmounts((prev) => ({ ...prev, [advance.id]: v }))}
                      />
                      {needsRate && (
                        <DecimalInput
                          scale={8}
                          placeholder="Курс пересчёта"
                          className="h-10"
                          value={advanceSettlementRates[advance.id] ?? ""}
                          onValueChange={(v) =>
                            setAdvanceSettlementRates((prev) => ({ ...prev, [advance.id]: v }))
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="purchase-cash-paid">Оплата сейчас (необязательно)</Label>
          <DecimalInput
            id="purchase-cash-paid"
            scale={2}
            className="h-11"
            value={cashPaid}
            onValueChange={setCashPaid}
            placeholder="0.00"
          />
        </div>

        {/* Only asked once there is a payment to route — an unpaid
          * purchase touches neither account. */}
        {cashPaid.trim() && (
          <CashAccountPicker
            id="purchase-cash-account"
            value={cashAccount}
            onChange={setCashAccount}
            label="Откуда оплачено"
          />
        )}

        <div className="space-y-2">
          <Label htmlFor="purchase-invoice">№ накладной</Label>
          <Input id="purchase-invoice" className="h-11" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchase-date">Дата</Label>
          <Input
            id="purchase-date"
            type="date"
            className="h-11"
            value={occurredAt}
            max={todayBusinessDate()}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchase-comment">Комментарий</Label>
          <Textarea id="purchase-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>

        <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:px-0 md:py-0">
          <Button type="submit" className="h-11 w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Сохранение…" : "Оформить закупку"}
          </Button>
        </div>
      </form>

      <CreateSupplierDialog
        open={createSupplierOpen}
        onOpenChange={setCreateSupplierOpen}
        onCreated={(supplier) => {
          setSupplierId(supplier.id);
          setSelectedAdvanceIds([]);
        }}
      />
      <CreateWarehouseDialog
        open={createWarehouseOpen}
        onOpenChange={setCreateWarehouseOpen}
        onCreated={(warehouse) => setWarehouseId(warehouse.id)}
      />
      <CreateMaterialDialog
        open={createMaterialOpen}
        onOpenChange={setCreateMaterialOpen}
        onCreated={(material) => assignMaterialToRow(material.id)}
      />
    </div>
  );
}
