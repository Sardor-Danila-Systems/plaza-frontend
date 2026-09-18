"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SECTIONS, QUICK_ACTIONS } from "@/lib/nav/config";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";

/** Real ⌘K / Ctrl+K navigation — jumps to an existing section or quick
 * action. Intentionally does not pretend to search entity data (suppliers,
 * materials, transactions): no such search endpoint exists yet, and a
 * decorative search box that returns nothing would be worse than none. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  const items = useMemo(() => {
    const nav = SECTIONS.map((s) => ({ href: s.href, label: s.label, icon: s.icon, kind: "Раздел" }));
    const actions = canMutate
      ? QUICK_ACTIONS.map((a) => ({ href: a.href, label: a.label, icon: a.icon, kind: "Действие" }))
      : [];
    const all = [...nav, ...actions];
    if (!query.trim()) return all;
    const q = query.trim().toLowerCase();
    return all.filter((i) => i.label.toLowerCase().includes(q));
  }, [query, canMutate]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden truncate sm:inline">Поиск разделов и действий…</span>
        <span className="ml-auto hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          ⌘K
        </span>
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
          <DialogTitle className="sr-only">Быстрый переход</DialogTitle>
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Куда перейти?"
              className="h-12 border-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-1.5">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Ничего не найдено</p>
            ) : (
              items.map((item) => (
                <button
                  key={`${item.kind}-${item.href}`}
                  type="button"
                  onClick={() => go(item.href)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <item.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.kind}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
