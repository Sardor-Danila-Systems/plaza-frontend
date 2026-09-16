import { useState } from "react";
import Decimal from "decimal.js";
import { useFinanceBalance, useCurrencyRates } from "@/lib/query/hooks/use-finance";

export interface CombinedCash {
  uzsCash: string;
  usdCash: string;
  /** The USD/UZS rate actually used for the combined figures below, or
   * null if none is available yet (no recorded rate and no manual entry). */
  rate: string | null;
  rateSource: "recent" | "manual" | null;
  totalUzs: string | null;
  totalUsd: string | null;
  isLoading: boolean;
  /** Session-local only — never persisted, never sent to the backend.
   * Purely confirms which rate this DISPLAY calculation uses when no
   * recorded rate exists yet. */
  manualRate: string;
  setManualRate: (value: string) => void;
}

/**
 * A CURRENT combined-cash figure is informational/display-only — it never
 * rewrites ledger values or historical transaction exchange rates (those
 * stay frozen on each transaction forever). The rate used here is always
 * shown explicitly next to the total so nobody mistakes it for an
 * authoritative accounting figure.
 */
export function useCombinedCash(): CombinedCash {
  const { data: balance, isLoading: balanceLoading } = useFinanceBalance();
  const { data: rates, isLoading: ratesLoading } = useCurrencyRates();
  const [manualRate, setManualRate] = useState("");

  const uzsCash = balance?.uzs ?? "0";
  const usdCash = balance?.usd ?? "0";

  // currency-rates are returned sorted `effectiveOn desc, createdAt desc`
  // by the backend (confirmed against currency-rates.service.ts), so the
  // first USD row here is reliably the most recent quote — no extra
  // client-side sort needed.
  const recentUsdRate = rates?.find((r) => r.currency === "USD")?.rateUzs ?? null;

  let rate: string | null = recentUsdRate;
  let rateSource: "recent" | "manual" | null = recentUsdRate ? "recent" : null;
  if (!rate && manualRate) {
    try {
      if (new Decimal(manualRate).isPositive()) {
        rate = manualRate;
        rateSource = "manual";
      }
    } catch {
      // not a parseable number yet — leave rate null, user is still typing
    }
  }

  let totalUzs: string | null = null;
  let totalUsd: string | null = null;
  if (rate) {
    try {
      const rateDec = new Decimal(rate);
      const uzsDec = new Decimal(uzsCash);
      const usdDec = new Decimal(usdCash);
      totalUzs = uzsDec.plus(usdDec.times(rateDec)).toFixed(2);
      totalUsd = usdDec.plus(uzsDec.dividedBy(rateDec)).toFixed(2);
    } catch {
      totalUzs = null;
      totalUsd = null;
    }
  }

  return {
    uzsCash,
    usdCash,
    rate,
    rateSource,
    totalUzs,
    totalUsd,
    isLoading: balanceLoading || ratesLoading,
    manualRate,
    setManualRate,
  };
}
