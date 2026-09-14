"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, HandCoins, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState } from "@/components/shared/error-state";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { MoneyText } from "@/components/shared/money-text";
import {
  useSupplier,
  useSupplierLedger,
  useCreateSupplierAdvance,
  useCreateDebtPayment,
} from "@/lib/query/hooks/use-suppliers";
import { useCurrencyRates } from "@/lib/query/hooks/use-finance";
import { useIdempotencyKey } from "@/lib/idempotency";
import { getErrorMessage } from "@/lib/errors/map";
import { formatBusinessDate, todayBusinessDate } from "@/lib/format/date";
import { isPositiveDecimalString } from "@/lib/format/decimal";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";
import type { Currency } from "@/lib/api/types";

export function SupplierDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);
  const { data: supplier, isLoading, isError, error, refetch } = useSupplier(id);
  const { data: ledger, isLoading: ledgerLoading } = useSupplierLedger(id);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [debtOpen, setDebtOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (isError || !supplier) return <ErrorState error={error} onRetry={() => refetch()} />;

  const hasDebt = (ledger?.outstandingDebt ?? []).some((d) => Number(d.amount) > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold">{supplier.name}</h1>
        {!supplier.isActive && <Badge variant="secondary">Архив</Badge>}
      </div>

      {supplier.contactPerson || supplier.phone ? (
        <Card>
          <CardContent className="space-y-1 pt-4 text-sm">
            {supplier.contactPerson && <p>{supplier.contactPerson}</p>}
            {supplier.phone && <p className="text-muted-foreground">{supplier.phone}</p>}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="space-y-1 pt-4">
            <p className="text-xs font-medium text-muted-foreground">Долг</p>
            {ledgerLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (ledger?.outstandingDebt ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет</p>
            ) : (
              ledger!.outstandingDebt.map((d) => (
                <p key={d.currency} className="font-medium tabular-nums">
                  <MoneyText value={d.amount} currency={d.currency} />
                </p>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-4">
            <p className="text-xs font-medium text-muted-foreground">Доступный аванс</p>
            {ledgerLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (ledger?.availableAdvance ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет</p>
            ) : (
              ledger!.availableAdvance.map((d) => (
                <p key={d.currency} className="font-medium tabular-nums">
                  <MoneyText value={d.amount} currency={d.currency} />
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {canMutate && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setAdvanceOpen(true)}>
            <Wallet className="size-4" />
            Аванс
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            disabled={!hasDebt}
            onClick={() => setDebtOpen(true)}
          >
            <HandCoins className="size-4" />
            Оплата долга
          </Button>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Закупки</h2>
        {ledgerLoading ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : (ledger?.purchases ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Закупок пока нет</p>
        ) : (
          <DataList>
            {ledger!.purchases.map((p) => (
              <DataListRow key={p.id}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{formatBusinessDate(p.occurredAt)}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.cancelled ? "Отменена" : Number(p.remainingDebt) > 0 ? "Есть долг" : "Оплачена"}
                  </p>
                </div>
                <div className="text-right">
                  <MoneyText value={p.totalAmount} currency={p.currency} />
                  {Number(p.remainingDebt) > 0 && !p.cancelled && (
                    <p className="text-xs text-destructive">
                      Долг: <MoneyText value={p.remainingDebt} currency={p.currency} />
                    </p>
                  )}
                </div>
              </DataListRow>
            ))}
          </DataList>
        )}
      </div>

      <AdvanceDialog supplierId={id} open={advanceOpen} onOpenChange={setAdvanceOpen} />
      <DebtPaymentDialog
        supplierId={id}
        purchases={ledger?.purchases ?? []}
        open={debtOpen}
        onOpenChange={setDebtOpen}
      />
    </div>
  );
}

function AdvanceDialog({
  supplierId,
  open,
  onOpenChange,
}: {
  supplierId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [currency, setCurrency] = useState<Currency>("UZS");
  const [amount, setAmount] = useState("");
  const [rateMode, setRateMode] = useState<"referenced" | "manual">("referenced");
  const [currencyRateId, setCurrencyRateId] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [rateOverrideReason, setRateOverrideReason] = useState("");
  const [comment, setComment] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayBusinessDate());
  const [formError, setFormError] = useState<string | null>(null);

  const { data: currencyRates = [] } = useCurrencyRates();
  const createMutation = useCreateSupplierAdvance();
  const { key, renew } = useIdempotencyKey();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!isPositiveDecimalString(amount)) {
      setFormError("Введите корректную сумму");
      return;
    }
    if (currency === "USD" && rateMode === "referenced" && !currencyRateId) {
      setFormError("Выберите курс или введите его вручную");
      return;
    }
    if (currency === "USD" && rateMode === "manual" && (!exchangeRate || !rateOverrideReason.trim())) {
      setFormError("Укажите курс и причину его ручного ввода");
      return;
    }

    createMutation.mutate(
      {
        supplierId,
        body: {
          currency,
          amount,
          ...(currency === "USD" && rateMode === "referenced" ? { currencyRateId } : {}),
          ...(currency === "USD" && rateMode === "manual"
            ? { exchangeRate, rateOverrideReason: rateOverrideReason.trim() }
            : {}),
          comment: comment.trim() || undefined,
          occurredAt,
        },
        idempotencyKey: key,
      },
      {
        onSuccess: () => {
          renew();
          toast.success("Аванс оформлен");
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Новый аванс поставщику">
      <form onSubmit={onSubmit} className="space-y-4">
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <div className="space-y-2">
          <Label id="advance-amount-label" htmlFor="advance-amount">Сумма</Label>
          <div className="flex gap-2">
            <Input
              id="advance-amount"
              inputMode="decimal"
              className="h-11 flex-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="h-11 w-24" aria-label="Валюта">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UZS">UZS</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {currency === "USD" && (
          <RateFields
            rateMode={rateMode}
            setRateMode={setRateMode}
            currencyRateId={currencyRateId}
            setCurrencyRateId={setCurrencyRateId}
            exchangeRate={exchangeRate}
            setExchangeRate={setExchangeRate}
            rateOverrideReason={rateOverrideReason}
            setRateOverrideReason={setRateOverrideReason}
            currencyRates={currencyRates}
          />
        )}

        <div className="space-y-2">
          <Label htmlFor="advance-date">Дата</Label>
          <Input
            id="advance-date"
            type="date"
            className="h-11"
            value={occurredAt}
            max={todayBusinessDate()}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="advance-comment">Комментарий</Label>
          <Textarea id="advance-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>

        <Button type="submit" className="h-11 w-full" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Сохранение…" : "Оформить аванс"}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}

function DebtPaymentDialog({
  supplierId,
  purchases,
  open,
  onOpenChange,
}: {
  supplierId: string;
  purchases: { id: string; currency: Currency; remainingDebt: string; cancelled: boolean; occurredAt: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const payable = purchases.filter((p) => !p.cancelled && Number(p.remainingDebt) > 0);
  const [purchaseId, setPurchaseId] = useState("");
  const [currency, setCurrency] = useState<Currency>("UZS");
  const [amount, setAmount] = useState("");
  const [rateMode, setRateMode] = useState<"referenced" | "manual">("referenced");
  const [currencyRateId, setCurrencyRateId] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [rateOverrideReason, setRateOverrideReason] = useState("");
  const [settlementExchangeRate, setSettlementExchangeRate] = useState("");
  const [comment, setComment] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayBusinessDate());
  const [formError, setFormError] = useState<string | null>(null);

  const { data: currencyRates = [] } = useCurrencyRates();
  const createMutation = useCreateDebtPayment();
  const { key, renew } = useIdempotencyKey();

  const selectedPurchase = payable.find((p) => p.id === purchaseId);
  const needsSettlementRate =
    !!selectedPurchase && selectedPurchase.currency !== currency && selectedPurchase.currency !== "UZS";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!purchaseId) {
      setFormError("Выберите закупку");
      return;
    }
    if (!isPositiveDecimalString(amount)) {
      setFormError("Введите корректную сумму");
      return;
    }
    if (currency === "USD" && rateMode === "referenced" && !currencyRateId) {
      setFormError("Выберите курс или введите его вручную");
      return;
    }
    if (currency === "USD" && rateMode === "manual" && (!exchangeRate || !rateOverrideReason.trim())) {
      setFormError("Укажите курс и причину его ручного ввода");
      return;
    }
    if (needsSettlementRate && !settlementExchangeRate) {
      setFormError("Укажите курс пересчёта для закрытия долга в другой валюте");
      return;
    }

    createMutation.mutate(
      {
        supplierId,
        body: {
          purchaseId,
          currency,
          amount,
          ...(currency === "USD" && rateMode === "referenced" ? { currencyRateId } : {}),
          ...(currency === "USD" && rateMode === "manual"
            ? { exchangeRate, rateOverrideReason: rateOverrideReason.trim() }
            : {}),
          ...(needsSettlementRate ? { settlementExchangeRate } : {}),
          comment: comment.trim() || undefined,
          occurredAt,
        },
        idempotencyKey: key,
      },
      {
        onSuccess: () => {
          renew();
          toast.success("Оплата проведена");
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Оплата долга поставщику">
      <form onSubmit={onSubmit} className="space-y-4">
        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <div className="space-y-2">
          <Label id="debt-purchase-label">Закупка</Label>
          <Select value={purchaseId} onValueChange={setPurchaseId}>
            <SelectTrigger className="h-11 w-full" aria-labelledby="debt-purchase-label">
              <SelectValue placeholder="Выберите закупку с долгом" />
            </SelectTrigger>
            <SelectContent>
              {payable.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {formatBusinessDate(p.occurredAt)} — долг {p.remainingDebt} {p.currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="debt-amount">Сумма оплаты</Label>
          <div className="flex gap-2">
            <Input
              id="debt-amount"
              inputMode="decimal"
              className="h-11 flex-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="h-11 w-24" aria-label="Валюта">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UZS">UZS</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {currency === "USD" && (
          <RateFields
            rateMode={rateMode}
            setRateMode={setRateMode}
            currencyRateId={currencyRateId}
            setCurrencyRateId={setCurrencyRateId}
            exchangeRate={exchangeRate}
            setExchangeRate={setExchangeRate}
            rateOverrideReason={rateOverrideReason}
            setRateOverrideReason={setRateOverrideReason}
            currencyRates={currencyRates}
          />
        )}

        {needsSettlementRate && (
          <div className="space-y-2">
            <Label htmlFor="debt-settlement-rate">Курс закрытия долга ({selectedPurchase?.currency} за оплату)</Label>
            <Input
              id="debt-settlement-rate"
              inputMode="decimal"
              className="h-11"
              value={settlementExchangeRate}
              onChange={(e) => setSettlementExchangeRate(e.target.value)}
              placeholder="Например, 12500.00000000"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="debt-date">Дата</Label>
          <Input
            id="debt-date"
            type="date"
            className="h-11"
            value={occurredAt}
            max={todayBusinessDate()}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="debt-comment">Комментарий</Label>
          <Textarea id="debt-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>

        <Button type="submit" className="h-11 w-full" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Сохранение…" : "Оплатить"}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}

function RateFields({
  rateMode,
  setRateMode,
  currencyRateId,
  setCurrencyRateId,
  exchangeRate,
  setExchangeRate,
  rateOverrideReason,
  setRateOverrideReason,
  currencyRates,
}: {
  rateMode: "referenced" | "manual";
  setRateMode: (v: "referenced" | "manual") => void;
  currencyRateId: string;
  setCurrencyRateId: (v: string) => void;
  exchangeRate: string;
  setExchangeRate: (v: string) => void;
  rateOverrideReason: string;
  setRateOverrideReason: (v: string) => void;
  currencyRates: { id: string; rateUzs: string; effectiveOn: string }[];
}) {
  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 ${rateMode === "referenced" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          onClick={() => setRateMode("referenced")}
        >
          Курс из списка
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 ${rateMode === "manual" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          onClick={() => setRateMode("manual")}
        >
          Свой курс
        </button>
      </div>
      {rateMode === "referenced" ? (
        <Select value={currencyRateId} onValueChange={setCurrencyRateId}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue placeholder="Выберите курс" />
          </SelectTrigger>
          <SelectContent>
            {currencyRates.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.rateUzs} сум ({r.effectiveOn})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="space-y-2">
          <Input
            inputMode="decimal"
            className="h-11"
            placeholder="Курс, сум за 1 USD"
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
          />
          <Textarea
            placeholder="Причина ручного ввода курса"
            value={rateOverrideReason}
            onChange={(e) => setRateOverrideReason(e.target.value)}
            rows={2}
          />
        </div>
      )}
    </div>
  );
}
