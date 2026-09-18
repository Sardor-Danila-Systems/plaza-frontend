"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProjectSwitcher } from "@/components/layout/project-switcher";
import { CommandPalette } from "@/components/layout/command-palette";
import { useAuth } from "@/lib/auth/auth-provider";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Владелец",
  ACCOUNTANT: "Бухгалтер",
  PROJECT_MANAGER: "Менеджер проекта",
};

export function Topbar() {
  const { user, logout } = useAuth();
  const initials = user?.displayName
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:h-16 md:px-6">
      <div className="md:hidden">
        <ProjectSwitcher />
      </div>
      <div className="hidden flex-1 justify-center md:flex">
        <CommandPalette />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Link href="/profile" className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium leading-tight">{user?.displayName}</p>
            <p className="text-xs text-muted-foreground leading-tight">
              {user ? ROLE_LABELS[user.role] : ""}
            </p>
          </div>
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Выйти">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
