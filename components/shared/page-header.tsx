import { cn } from "cn";

/** Consistent page header used across every route: a title, an optional
 * one-line subtitle (project/section context), and a right-aligned action
 * slot (usually a single primary button). Kept plain — no card, no
 * decorative background — to match the restrained ERP style. */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Small uppercase label used above a group of controls or a nav/section
 * group — never a full heading, just a quiet divider in tracking-wide caps. */
export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80", className)}>
      {children}
    </p>
  );
}
