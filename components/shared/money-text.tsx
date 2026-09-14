import { cn } from "cn";
import { formatMoney } from "@/lib/format/decimal";
import type { Currency, TransactionDirection } from "@/lib/api/types";

export function MoneyText({
  value,
  currency,
  direction,
  className,
}: {
  value: string;
  currency: Currency;
  direction?: TransactionDirection;
  className?: string;
}) {
  const sign = direction === "IN" ? "+" : direction === "OUT" ? "−" : "";
  const colorClass =
    direction === "IN"
      ? "text-success"
      : direction === "OUT"
        ? "text-destructive"
        : "text-foreground";

  return (
    <span className={cn("font-medium tabular-nums", colorClass, className)}>
      {sign}
      {formatMoney(value, currency)}
    </span>
  );
}
