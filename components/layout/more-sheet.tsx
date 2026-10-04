"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { BOTTOM_NAV_PINNED, MORE_ICON as MoreIcon, sectionsForRole } from "@/lib/nav/config";
import { useAuth } from "@/lib/auth/auth-provider";
import { cn } from "cn";

export function MoreSheet() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  // Everything the role may open that isn't already pinned in the bottom nav.
  const items = sectionsForRole(user?.role).filter((s) => !BOTTOM_NAV_PINNED.includes(s.href));

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
