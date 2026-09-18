import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";

/** Compact horizontal metric strip — a single bordered row divided into
 * cells, each a small label over a large number. This is the "no giant
 * colorful KPI cards" pattern used on Dashboard and Analytics: metrics
 * read fast because they're side by side, not scattered across cards. */
export function StatRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card sm:grid-cols-4 sm:divide-y-0 sm:divide-x",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  tone = "default",
  isLoading,
  className,
}: {
  label: React.ReactNode;
  value?: React.ReactNode;
  tone?: "default" | "positive" | "negative" | "warning";
  isLoading?: boolean;
  className?: string;
}) {
  const toneClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-destructive"
        : tone === "warning"
          ? "text-warning-foreground"
          : "text-foreground";

  return (
    <div className={cn("px-4 py-3.5", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      {isLoading ? (
        <Skeleton className="mt-1.5 h-7 w-24" />
      ) : (
        <p className={cn("mt-0.5 text-xl font-semibold tabular-nums", toneClass)}>{value}</p>
      )}
    </div>
  );
}
