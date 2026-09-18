import { cn } from "cn";

/** A single scannable list used on every list page — rows stack as cards,
 * which reads well at both phone and desktop widths without a
 * desktop-only table that would need its own separate markup. */
export function DataList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("divide-y divide-border overflow-hidden rounded-lg border border-border bg-card", className)}>
      {children}
    </div>
  );
}

export function DataListRow({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50 active:bg-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}
