"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { SECTIONS } from "@/lib/nav/config";
import { QUICK_ACTIONS } from "@/lib/nav/config";
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
import { useRouter } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);
  const router = useRouter();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
          EP
        </div>
        <span className="font-semibold">Euro Plaza</span>
      </div>

      {canMutate && (
        <div className="px-3 pt-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full justify-start gap-2">
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

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {SECTIONS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active && "bg-accent text-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
