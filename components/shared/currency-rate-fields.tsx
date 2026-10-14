"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DecimalInput } from "@/components/ui/masked-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCurrencyRates, useCreateCurrencyRate, useLiveCurrencyRate } from "@/lib/query/hooks/use-finance";
import { formatMoney } from "@/lib/format/decimal";
import type { Currency } from "@/lib/api/types";

type RateMode = "referenced" | "manual";

/** The exchange-rate part of every USD-capable cash form (операция, закупка,
 * аванс, оплата долга): which saved rate is used, or a manual one with the
 * reason it was typed in. UZS needs none of it. */
export function useRateForm() {
  const [rateMode, setRateMode] = useState<RateMode>("referenced");
  const [currencyRateId, setCurrencyRateId] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [rateOverrideReason, setRateOverrideReason] = useState("");

  return {
    rateMode,
    setRateMode,
    currencyRateId,
    setCurrencyRateId,
    exchangeRate,
    setExchangeRate,
    rateOverrideReason,
    setRateOverrideReason,
    /** An error message when a USD amount has no usable rate, otherwise null. */
    validate(currency: Currency): string | null {
      if (currency !== "USD") return null;
      if (rateMode === "referenced" && !currencyRateId) return "Выберите курс или введите его вручную";
      if (rateMode === "manual" && (!exchangeRate || !rateOverrideReason.trim())) {
        return "Укажите курс и причину его ручного ввода";
      }
      return null;
    },
    /** The rate fields of the request body (nothing for UZS). */
    body(currency: Currency) {
      if (currency !== "USD") return {};
      return rateMode === "referenced"
        ? { currencyRateId }
        : { exchangeRate, rateOverrideReason: rateOverrideReason.trim() };
    },
  };
}

export type RateForm = ReturnType<typeof useRateForm>;

export function CurrencySelect({
  value,
  onChange,
  className = "h-11 w-24",
}: {
  value: Currency;
  onChange: (currency: Currency) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v as Currency)}>
      <SelectTrigger className={className} aria-label="Валюта">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="UZS">UZS</SelectItem>
        <SelectItem value="USD">USD</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function RateFields({ form }: { form: RateForm }) {
  const { data: currencyRates = [] } = useCurrencyRates();
  const { data: liveRate } = useLiveCurrencyRate();
  const createRate = useCreateCurrencyRate();

  const saveLiveRate = () => {
    if (!liveRate) return;
    createRate.mutate(
      { currency: "USD", rateUzs: liveRate.rateUzs, effectiveOn: liveRate.asOf, source: "PROVIDER" },
      { onSuccess: (rate) => form.setCurrencyRateId(rate.id) },
    );
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <Tabs value={form.rateMode} onValueChange={(v) => form.setRateMode(v as RateMode)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="referenced">Курс из списка</TabsTrigger>
          <TabsTrigger value="manual">Свой курс</TabsTrigger>
        </TabsList>
      </Tabs>

      {form.rateMode === "referenced" ? (
        currencyRates.length > 0 ? (
          <Select value={form.currencyRateId} onValueChange={(v) => v && form.setCurrencyRateId(v)}>
            <SelectTrigger className="h-11 w-full" aria-label="Курс">
              <SelectValue placeholder="Выберите курс" />
            </SelectTrigger>
            <SelectContent>
              {currencyRates.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {formatMoney(r.rateUzs, "UZS")} ({r.effectiveOn})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : liveRate ? (
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <p className="text-sm text-muted-foreground">
              В проекте ещё нет сохранённых курсов. Актуальный официальный курс ЦБ РУз на {liveRate.asOf}:{" "}
              <span className="font-medium text-foreground">{formatMoney(liveRate.rateUzs, "UZS")}</span> за 1 USD.
            </p>
            <Button
              type="button"
              size="sm"
              variant={form.currencyRateId ? "secondary" : "default"}
              disabled={createRate.isPending}
              onClick={saveLiveRate}
            >
              {form.currencyRateId ? "Курс использован" : createRate.isPending ? "Сохранение…" : "Использовать этот курс"}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            В проекте ещё нет сохранённых курсов, а актуальный курс сейчас недоступен — введите курс вручную.
          </p>
        )
      ) : (
        <div className="space-y-2">
          <DecimalInput
            scale={8}
            className="h-11"
            placeholder="Курс, сум за 1 USD"
            value={form.exchangeRate}
            onValueChange={form.setExchangeRate}
          />
          <Textarea
            placeholder="Причина ручного ввода курса"
            value={form.rateOverrideReason}
            onChange={(e) => form.setRateOverrideReason(e.target.value)}
            rows={2}
          />
        </div>
      )}
    </div>
  );
}
