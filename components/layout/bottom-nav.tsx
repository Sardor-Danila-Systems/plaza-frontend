"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { bottomNavForRole, quickActionsForRole } from "@/lib/nav/config";
import { QuickActionSheet } from "@/components/layout/quick-action-sheet";
import { MoreSheet } from "@/components/layout/more-sheet";
import { useAuth } from "@/lib/auth/auth-provider";

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-2 text-muted-foreground",
        active && "text-primary",
      )}
    >
      <Icon className="size-5" />
      <span className="text-[11px] font-medium">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const { user } = useAuth();
  const canMutate = quickActionsForRole(user?.role).length > 0;
  const { left, right, showMore } = bottomNavForRole(user?.role);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {left.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}

      {canMutate ? (
        <div className="flex flex-1 items-center justify-center">
          <QuickActionSheet triggerClassName="-translate-y-3" />
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {right.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
      {showMore && <MoreSheet />}
    </nav>
  );
}
