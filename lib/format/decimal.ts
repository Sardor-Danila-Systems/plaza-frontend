import Decimal from "decimal.js";
import type { Currency } from "@/lib/api/types";

/**
 * Display-only formatting for backend decimal strings. Never used to
 * compute a value that gets submitted — the backend's own totals are
 * always authoritative (see docs/frontend-integration.md's "Decimals are
 * serialized as strings" note).
 */
export function formatMoney(value: string | null | undefined, currency: Currency): string {
  if (value == null) return "—";
  const decimal = new Decimal(value);
  const formatted = decimal.toDecimalPlaces(2).toFixed(2);
  const [intPart, fracPart] = formatted.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const withSign = decimal.isNegative() ? `-${grouped.replace("-", "")}` : grouped;
  const suffix = currency === "USD" ? "$" : "сум";
  return `${withSign},${fracPart} ${suffix}`;
}

export function formatQuantity(value: string | null | undefined, unitSymbol?: string): string {
  if (value == null) return "—";
  const decimal = new Decimal(value);
  // Quantities carry up to 6 fractional digits server-side; trim trailing
  // zeros for a readable display value without losing precision.
  const trimmed = decimal.toDecimalPlaces(3).toFixed();
  const [intPart, fracPart] = trimmed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const display = fracPart && Number(fracPart) !== 0 ? `${grouped}.${fracPart}` : grouped;
  return unitSymbol ? `${display} ${unitSymbol}` : display;
}

/** Preview-only arithmetic for form UX (e.g. purchase line-total while
 * typing). Never sent to the server — the response's own totals win. */
export function previewMultiply(a: string, b: string): string {
  try {
    return new Decimal(a || "0").times(b || "0").toString();
  } catch {
    return "0";
  }
}

export function previewSum(values: string[]): string {
  try {
    return values.reduce((acc, v) => acc.plus(v || "0"), new Decimal(0)).toString();
  } catch {
    return "0";
  }
}

/** Abbreviated form for chart axis labels only (e.g. "12,5 млн") — the
 * exact figure always still appears in the tooltip via formatMoney. Uses
 * plain Number since this is a purely cosmetic axis tick, not an
 * accounting value. */
export function formatMoneyAbbrev(value: number, currency: "UZS" | "USD"): string {
  const abs = Math.abs(value);
  const suffix = currency === "USD" ? "$" : "";
  const sub = currency === "UZS" ? " сум" : "";
  let formatted: string;
  if (abs >= 1_000_000_000) formatted = `${(value / 1_000_000_000).toFixed(1)} млрд`;
  else if (abs >= 1_000_000) formatted = `${(value / 1_000_000).toFixed(1)} млн`;
  else if (abs >= 1_000) formatted = `${(value / 1_000).toFixed(0)} тыс`;
  else formatted = value.toFixed(0);
  return currency === "USD" ? `${suffix}${formatted}` : `${formatted}${sub}`;
}

export function isPositiveDecimalString(value: string): boolean {
  try {
    return new Decimal(value).greaterThan(0);
  } catch {
    return false;
  }
}
