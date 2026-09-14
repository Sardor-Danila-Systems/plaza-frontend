"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { QUICK_ACTIONS } from "@/lib/nav/config";
import { cn } from "cn";

export function QuickActionSheet({ triggerClassName }: { triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        aria-label="Новая операция"
        onClick={() => setOpen(true)}
        className={cn(
          "flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95",
          triggerClassName,
        )}
      >
        <Plus className="size-6" />
      </button>

      <ResponsiveDialog open={open} onOpenChange={setOpen} title="Новая операция">
        <div className="grid grid-cols-2 gap-3 pb-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.href}
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(action.href);
              }}
              className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted active:bg-muted"
            >
              <action.icon className="size-6 text-primary" />
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </ResponsiveDialog>
    </>
  );
}
