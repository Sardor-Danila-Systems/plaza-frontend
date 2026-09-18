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
  Banknote,
  HandCoins,
  BarChart3,
  ScrollText,
  FileSpreadsheet,
  UserCircle,
} from "lucide-react";

export type NavGroup = "OVERVIEW" | "FINANCE" | "WAREHOUSE" | "OPERATIONS" | "REPORTING" | "OBJECTS" | "ACCOUNT";

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  OVERVIEW: "Обзор",
  FINANCE: "Финансы",
  WAREHOUSE: "Склад",
  OPERATIONS: "Операции",
  REPORTING: "Отчётность",
  OBJECTS: "Объекты",
  ACCOUNT: "Аккаунт",
};

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
}

/** Full section list — used by the desktop sidebar (grouped) and the
 * mobile "Ещё" sheet (flat). Order is load-bearing: BOTTOM_NAV_LEFT/RIGHT
 * below index into this array by position. */
export const SECTIONS: NavItem[] = [
  { href: "/dashboard", label: "Главная", icon: LayoutDashboard, group: "OVERVIEW" },
  { href: "/finance", label: "Касса", icon: Wallet, group: "FINANCE" },
  { href: "/suppliers", label: "Поставщики", icon: Users, group: "FINANCE" },
  { href: "/warehouses", label: "Склады", icon: Warehouse, group: "WAREHOUSE" },
  { href: "/materials", label: "Материалы", icon: Package, group: "WAREHOUSE" },
  { href: "/purchases", label: "Закупки", icon: ShoppingCart, group: "FINANCE" },
  { href: "/write-offs", label: "Списания", icon: ClipboardMinus, group: "WAREHOUSE" },
  { href: "/transfers", label: "Перемещения", icon: ArrowLeftRight, group: "WAREHOUSE" },
  { href: "/history", label: "История", icon: History, group: "OPERATIONS" },
  { href: "/analytics", label: "Аналитика", icon: BarChart3, group: "OVERVIEW" },
  { href: "/audit", label: "Аудит", icon: ScrollText, group: "OPERATIONS" },
  { href: "/reports", label: "Отчёты", icon: FileSpreadsheet, group: "REPORTING" },
  { href: "/settings/construction", label: "Объекты", icon: Settings, group: "OBJECTS" },
  { href: "/profile", label: "Профиль", icon: UserCircle, group: "ACCOUNT" },
];

/** Sidebar rendering order for the groups above — Аккаунт is deliberately
 * excluded here since it's shown in the sidebar's user footer, not as a
 * nav group (still reachable from the mobile "Ещё" sheet via SECTIONS). */
export const NAV_GROUP_ORDER: NavGroup[] = [
  "OVERVIEW",
  "FINANCE",
  "WAREHOUSE",
  "OPERATIONS",
  "REPORTING",
  "OBJECTS",
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
  { href: "/finance/new?type=SALARY", label: "Зарплата", icon: Banknote },
  { href: "/purchases/new", label: "Закупка", icon: ShoppingCart },
  { href: "/write-offs/new", label: "Списание", icon: ClipboardMinus },
  { href: "/suppliers?action=debt-payment", label: "Оплата поставщику", icon: HandCoins },
];
