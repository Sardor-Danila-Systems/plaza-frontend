import { format, parseISO } from "date-fns";
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
