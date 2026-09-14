"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { SECTIONS, MORE_ICON as MoreIcon } from "@/lib/nav/config";
import { cn } from "cn";

export function MoreSheet() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Everything not already pinned in the bottom nav (dashboard/finance/warehouses).
  const items = SECTIONS.filter((s) => !["/dashboard", "/finance", "/warehouses"].includes(s.href));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-1 flex-col items-center gap-1 py-2 text-muted-foreground"
      >
        <MoreIcon className="size-5" />
        <span className="text-[11px] font-medium">Ещё</span>
      </button>

      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Разделы">
        <div className="grid grid-cols-2 gap-2 pb-2">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted",
                  active && "border-primary bg-accent",
                )}
              >
                <item.icon className="size-5 text-primary" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </ResponsiveDialog>
    </>
  );
}
