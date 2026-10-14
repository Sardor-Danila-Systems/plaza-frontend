"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DecimalInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCombinedCash } from "@/lib/query/hooks/use-combined-cash";
import { useCreateCurrencyRate } from "@/lib/query/hooks/use-finance";
import { formatMoney } from "@/lib/format/decimal";
import { cn } from "cn";
import type { Currency } from "@/lib/api/types";

/**
 * "Общая касса" — a single combined figure across UZS and USD cash. This
 * is a DISPLAY computation only: it never writes anything back, and every
 * historical transaction keeps the exchange rate it was actually posted
 * at. The rate used for this display is always shown next to the total.
 */
export function CombinedCashCard() {
  const {
    uzsCash,
    usdCash,
    rate,
    rateSource,
    liveAsOf,
    liveStale,
    totalUzs,
    totalUsd,
    isLoading,
    manualRate,
    setManualRate,
  } = useCombinedCash();
  const [unit, setUnit] = useState<Currency>("UZS");
  const createRate = useCreateCurrencyRate();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-2 pt-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Общая касса</p>
          <div className="flex overflow-hidden rounded-md border text-xs">
            {(["UZS", "USD"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setUnit(c)}
                className={cn(
                  "px-2.5 py-1 font-medium transition-colors",
                  unit === c ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {rate ? (
          <>
            <p className="text-3xl font-semibold tabular-nums">
              {unit === "UZS" ? formatMoney(totalUzs, "UZS") : formatMoney(totalUsd, "USD")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted-foreground">
                По курсу: 1 USD = {formatMoney(rate, "UZS")}
                {rateSource === "manual" && " (введён вручную для отображения)"}
                {rateSource === "live" &&
                  (liveStale
                    ? ` (курс ЦБ РУз устарел, последний известный на ${liveAsOf})`
                    : ` (официальный курс ЦБ РУз на ${liveAsOf})`)}
              </p>
              {rateSource === "live" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  disabled={createRate.isPending}
                  onClick={() =>
                    createRate.mutate({
                      currency: "USD",
                      rateUzs: rate,
                      effectiveOn: liveAsOf ?? new Date().toISOString().slice(0, 10),
                      source: "PROVIDER",
                    })
                  }
                >
                  {createRate.isPending ? "Сохранение…" : "Сохранить как курс проекта"}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Курс USD/UZS ещё не задан в проекте — введите курс, чтобы увидеть общую сумму.
              Это значение используется только для отображения и не сохраняется.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="combined-cash-manual-rate" className="text-xs">
                Курс, сум за 1 USD
              </Label>
              <DecimalInput
                id="combined-cash-manual-rate"
                scale={2}
                className="h-10 max-w-48"
                placeholder="12500"
                value={manualRate}
                onValueChange={setManualRate}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 border-t pt-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">UZS</p>
            <p className="font-medium tabular-nums">{formatMoney(uzsCash, "UZS")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">USD</p>
            <p className="font-medium tabular-nums">{formatMoney(usdCash, "USD")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
