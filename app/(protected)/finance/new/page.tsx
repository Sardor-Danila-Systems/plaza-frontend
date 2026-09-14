"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateFinanceTransaction, useFinanceCategories, useCurrencyRates } from "@/lib/query/hooks/use-finance";
import { useIdempotencyKey } from "@/lib/idempotency";
import { getErrorMessage } from "@/lib/errors/map";
import { todayBusinessDate } from "@/lib/format/date";
import { isPositiveDecimalString } from "@/lib/format/decimal";
import type { CreatableTransactionType, Currency } from "@/lib/api/types";

const TYPE_LABELS: Record<CreatableTransactionType, string> = {
  INCOME: "Доход",
  EXPENSE: "Расход",
  SALARY: "Зарплата",
};

export default function NewFinanceTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = (searchParams.get("type") as CreatableTransactionType | null) ?? "INCOME";

  const [type, setType] = useState<CreatableTransactionType>(initialType);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("UZS");
  const [rateMode, setRateMode] = useState<"referenced" | "manual">("referenced");
  const [currencyRateId, setCurrencyRateId] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [rateOverrideReason, setRateOverrideReason] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [party, setParty] = useState("");
  const [comment, setComment] = useState("");
  const [occurredAt, setOccurredAt] = useState(todayBusinessDate());
  const [formError, setFormError] = useState<string | null>(null);

  const { data: categories = [] } = useFinanceCategories();
  const { data: currencyRates = [] } = useCurrencyRates();
  const createMutation = useCreateFinanceTransaction();
  const { key, renew } = useIdempotencyKey();

  const relevantCategories = categories.filter((c) => c.kind === type && c.isActive);

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
        body: {
          type,
          amount,
          currency,
          ...(currency === "USD" && rateMode === "referenced" ? { currencyRateId } : {}),
          ...(currency === "USD" && rateMode === "manual"
            ? { exchangeRate, rateOverrideReason: rateOverrideReason.trim() }
            : {}),
          categoryId: categoryId || undefined,
          source: type === "INCOME" ? party || undefined : undefined,
          recipient: type !== "INCOME" ? party || undefined : undefined,
          comment: comment.trim() || undefined,
          occurredAt,
        },
        idempotencyKey: key,
      },
      {
        onSuccess: (tx) => {
          renew();
          toast.success("Операция сохранена");
          router.replace(`/finance/${tx.id}`);
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
        <h1 className="text-lg font-semibold">Новая операция</h1>
      </div>

      <Tabs value={type} onValueChange={(v) => setType(v as CreatableTransactionType)}>
        <TabsList className="grid w-full grid-cols-3">
          {(Object.keys(TYPE_LABELS) as CreatableTransactionType[]).map((t) => (
            <TabsTrigger key={t} value={t}>
              {TYPE_LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <form onSubmit={onSubmit} className="space-y-4">
        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <div className="space-y-2">
          <Label htmlFor="amount">Сумма</Label>
          <div className="flex gap-2">
            <Input
              id="amount"
              inputMode="decimal"
              className="h-11 flex-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="h-11 w-24">
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
          <div className="space-y-3 rounded-lg border p-3">
            <Tabs value={rateMode} onValueChange={(v) => setRateMode(v as "referenced" | "manual")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="referenced">Курс из списка</TabsTrigger>
                <TabsTrigger value="manual">Свой курс</TabsTrigger>
              </TabsList>
            </Tabs>

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
        )}

        {relevantCategories.length > 0 && (
          <div className="space-y-2">
            <Label id="finance-category-label">Категория</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-11 w-full" aria-labelledby="finance-category-label">
                <SelectValue placeholder="Без категории" />
              </SelectTrigger>
              <SelectContent>
                {relevantCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="party">{type === "INCOME" ? "Источник" : "Получатель"}</Label>
          <Input
            id="party"
            className="h-11"
            value={party}
            onChange={(e) => setParty(e.target.value)}
            placeholder={type === "INCOME" ? "Например, взнос учредителя" : "Например, ФИО или организация"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="occurredAt">Дата</Label>
          <Input
            id="occurredAt"
            type="date"
            className="h-11"
            value={occurredAt}
            max={todayBusinessDate()}
            onChange={(e) => setOccurredAt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="comment">Комментарий</Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
          />
        </div>

        <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:px-0 md:py-0">
          <Button type="submit" className="h-11 w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Сохранение…" : "Сохранить"}
          </Button>
        </div>
      </form>
    </div>
  );
}
