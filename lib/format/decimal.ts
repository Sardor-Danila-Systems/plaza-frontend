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

/** The scaled number alone ("12,5 млн"), with no currency word — the piece
 * a chart can render on its own line when the full "… сум" form would not
 * fit (e.g. a donut's centre label). Uses a comma decimal separator to
 * match formatMoney's Russian formatting. Plain Number arithmetic is fine
 * here: this is a cosmetic label, never an accounting value. */
export function formatNumberAbbrev(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(".", ",")} млрд`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")} млн`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)} тыс`;
  return value.toFixed(0);
}

/** Abbreviated form for chart axis labels only (e.g. "12,5 млн сум") — the
 * exact figure always still appears in the tooltip via formatMoney. */
export function formatMoneyAbbrev(value: number, currency: "UZS" | "USD"): string {
  const formatted = formatNumberAbbrev(value);
  return currency === "USD" ? `$${formatted}` : `${formatted} сум`;
}

export function isPositiveDecimalString(value: string): boolean {
  try {
    return new Decimal(value).greaterThan(0);
  } catch {
    return false;
  }
}
