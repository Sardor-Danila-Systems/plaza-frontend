import { addDays, format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

/** Business dates from the API are plain `YYYY-MM-DD` — no timezone math. */
export function formatBusinessDate(value: string | null | undefined): string {
  if (!value) return "—";
  const datePart = value.slice(0, 10);
  try {
    return format(parseISO(datePart), "d MMM yyyy", { locale: ru });
  } catch {
    return datePart;
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "d MMM yyyy, HH:mm", { locale: ru });
  } catch {
    return value;
  }
}

export function todayBusinessDate(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/**
 * The backend's date-range filters are consistently `[dateFrom, dateTo)` —
 * an exclusive upper bound (documented for finance/purchase lists, and
 * confirmed for analytics/audit/reports too). A date `<input type=date>`
 * picker is inherently "up to and including this day" from a user's
 * perspective, so every date-range filter UI sends this (the day AFTER the
 * picked end date) as `dateTo`, never the raw picked value — otherwise the
 * end date the user chose would be silently excluded from its own range.
 */
export function toExclusiveEndDate(pickedDate: string): string {
  return format(addDays(parseISO(pickedDate), 1), "yyyy-MM-dd");
}
