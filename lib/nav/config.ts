import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Wallet,
  Users,
  Warehouse,
  Package,
  ShoppingCart,
  ClipboardMinus,
  ArrowLeftRight,
  History,
  Settings,
  MoreHorizontal,
  ArrowDownCircle,
  ArrowUpCircle,
  HandCoins,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Full section list — used by the desktop sidebar and the mobile "Ещё" sheet. */
export const SECTIONS: NavItem[] = [
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard },
  { href: "/finance", label: "Касса", icon: Wallet },
  { href: "/suppliers", label: "Поставщики", icon: Users },
  { href: "/warehouses", label: "Склады", icon: Warehouse },
  { href: "/materials", label: "Материалы", icon: Package },
  { href: "/purchases", label: "Закупки", icon: ShoppingCart },
  { href: "/write-offs", label: "Списания", icon: ClipboardMinus },
  { href: "/transfers", label: "Перемещения", icon: ArrowLeftRight },
  { href: "/history", label: "История", icon: History },
  { href: "/settings/construction", label: "Объекты", icon: Settings },
];

/** The 5-item mobile bottom nav — a subset of SECTIONS plus the quick-action "+". */
export const BOTTOM_NAV_LEFT: NavItem[] = [SECTIONS[0], SECTIONS[1]];
export const BOTTOM_NAV_RIGHT: NavItem[] = [SECTIONS[3]];
export const MORE_ICON = MoreHorizontal;

export interface QuickAction {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Central "+" quick actions — all are mutations, so only ever shown to
 * PROJECT_MANAGER (see lib/auth/permissions.ts). */
export const QUICK_ACTIONS: QuickAction[] = [
  { href: "/finance/new?type=INCOME", label: "Доход", icon: ArrowDownCircle },
  { href: "/finance/new?type=EXPENSE", label: "Расход", icon: ArrowUpCircle },
  { href: "/purchases/new", label: "Закупка", icon: ShoppingCart },
  { href: "/write-offs/new", label: "Списание", icon: ClipboardMinus },
  { href: "/suppliers?action=debt-payment", label: "Оплата поставщику", icon: HandCoins },
];
