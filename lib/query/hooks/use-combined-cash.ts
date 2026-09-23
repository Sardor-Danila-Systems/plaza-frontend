import { useEffect, useState } from "react";
import Decimal from "decimal.js";
import { useFinanceBalance, useCurrencyRates, useLiveCurrencyRate } from "@/lib/query/hooks/use-finance";

export interface CombinedCash {
  uzsCash: string;
  usdCash: string;
  /** The USD/UZS rate actually used for the combined figures below, or
   * null if none is available yet (no recorded rate, no live rate, and no
   * manual entry). */
  rate: string | null;
  rateSource: "recent" | "live" | "manual" | null;
  /** Set when rateSource is "live": the official quote date and whether it
   * came from cache after a failed refetch. */
  liveAsOf: string | null;
  liveStale: boolean;
  totalUzs: string | null;
  totalUsd: string | null;
  isLoading: boolean;
  /** Session-local only — never persisted, never sent to the backend.
   * Purely confirms which rate this DISPLAY calculation uses when no
   * recorded or live rate exists yet. Debounced before it affects `rate`
   * so typing doesn't recompute on every keystroke. */
  manualRate: string;
  setManualRate: (value: string) => void;
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);
  return debounced;
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
  const { data: liveRate, isLoading: liveLoading } = useLiveCurrencyRate();
  const [manualRate, setManualRate] = useState("");
  const debouncedManualRate = useDebounced(manualRate, 300);

  const uzsCash = balance?.uzs ?? "0";
  const usdCash = balance?.usd ?? "0";

  // currency-rates are returned sorted `effectiveOn desc, createdAt desc`
  // by the backend (confirmed against currency-rates.service.ts), so the
  // first USD row here is reliably the most recent quote — no extra
  // client-side sort needed.
  const recentUsdRate = rates?.find((r) => r.currency === "USD")?.rateUzs ?? null;

  let rate: string | null = null;
  let rateSource: "recent" | "live" | "manual" | null = null;
  if (recentUsdRate) {
    rate = recentUsdRate;
    rateSource = "recent";
  } else if (liveRate?.rateUzs) {
    rate = liveRate.rateUzs;
    rateSource = "live";
  } else if (debouncedManualRate) {
    try {
      if (new Decimal(debouncedManualRate).isPositive()) {
        rate = debouncedManualRate;
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
    liveAsOf: rateSource === "live" ? (liveRate?.asOf ?? null) : null,
    liveStale: rateSource === "live" ? (liveRate?.stale ?? false) : false,
    totalUzs,
    totalUsd,
    // Don't block on the live-rate fetch once a recorded project rate
    // already covers the calculation — only wait for it when it's actually
    // the rate in use.
    isLoading: balanceLoading || ratesLoading || (!recentUsdRate && liveLoading),
    manualRate,
    setManualRate,
  };
}
