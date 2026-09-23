"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "cn";
import { NAV_GROUP_LABELS, NAV_GROUP_ORDER, SECTIONS, QUICK_ACTIONS } from "@/lib/nav/config";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";
import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProjectSwitcher } from "@/components/layout/project-switcher";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Владелец",
  ACCOUNTANT: "Бухгалтер",
  PROJECT_MANAGER: "Менеджер проекта",
};

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);
  const router = useRouter();

  const initials = user?.displayName
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border px-5">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
          EP
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">Euro Plaza</span>
      </div>

      <div className="border-b border-sidebar-border px-5 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/80">Проект</p>
        <div className="mt-1">
          <ProjectSwitcher />
        </div>
      </div>

      {canMutate && (
        <div className="px-3 pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-9 w-full justify-start gap-2 text-sm">
                <Plus className="size-4" />
                Новая операция
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {QUICK_ACTIONS.map((action) => (
                <DropdownMenuItem key={action.href} onSelect={() => router.push(action.href)}>
                  <action.icon className="size-4" />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {NAV_GROUP_ORDER.map((group) => {
          const items = SECTIONS.filter((item) => item.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="space-y-0.5">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {NAV_GROUP_LABELS[group]}
              </p>
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      active && "bg-sidebar-accent font-medium text-sidebar-foreground",
                    )}
                  >
                    {active && (
                      <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary" aria-hidden />
                    )}
                    <item.icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <Link
        href="/profile"
        className="flex shrink-0 items-center gap-2.5 border-t border-sidebar-border px-4 py-3 transition-colors hover:bg-sidebar-accent"
      >
        <Avatar className="size-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight text-sidebar-foreground">
            {user?.displayName}
          </p>
          <p className="truncate text-xs leading-tight text-muted-foreground">
            {user ? ROLE_LABELS[user.role] : ""}
          </p>
        </div>
      </Link>
    </aside>
  );
}
