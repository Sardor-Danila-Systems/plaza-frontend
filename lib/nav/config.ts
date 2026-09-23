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

/** Tailwind color token name (matches app/globals.css's `--color-*`
 * tokens) used to tint a quick action's icon — a light touch of color per
 * action type so the dashboard's action tiles read at a glance instead of
 * all looking identically flat/grey. */
export type QuickActionTone = "success" | "destructive" | "gold" | "chart-4" | "warning" | "chart-5";

export interface QuickAction {
  href: string;
  label: string;
  icon: LucideIcon;
  tone: QuickActionTone;
}

/** Central "+" quick actions — all are mutations, so only ever shown to
 * PROJECT_MANAGER (see lib/auth/permissions.ts). */
export const QUICK_ACTIONS: QuickAction[] = [
  { href: "/finance/new?type=INCOME", label: "Доход", icon: ArrowDownCircle, tone: "success" },
  { href: "/finance/new?type=EXPENSE", label: "Расход", icon: ArrowUpCircle, tone: "destructive" },
  { href: "/finance/new?type=SALARY", label: "Зарплата", icon: Banknote, tone: "gold" },
  { href: "/purchases/new", label: "Закупка", icon: ShoppingCart, tone: "chart-4" },
  { href: "/write-offs/new", label: "Списание", icon: ClipboardMinus, tone: "warning" },
  { href: "/suppliers?action=debt-payment", label: "Оплата поставщику", icon: HandCoins, tone: "chart-5" },
];

/** Full literal class strings (not built from template interpolation —
 * Tailwind's static scanner needs to see the whole class name at build
 * time, so a `bg-${tone}/10` template would silently produce no CSS).
 * `warning` is the one tone with a dedicated contrast-safe text color
 * (`--warning-foreground`, per the same pairing Badge/Stat already use);
 * every other tone's own token doubles as both background tint and icon
 * color at different opacities. */
export const QUICK_ACTION_TONE_CLASSES: Record<QuickActionTone, { bg: string; icon: string }> = {
  success: { bg: "bg-success/10", icon: "text-success" },
  destructive: { bg: "bg-destructive/10", icon: "text-destructive" },
  gold: { bg: "bg-gold/10", icon: "text-gold" },
  "chart-4": { bg: "bg-chart-4/10", icon: "text-chart-4" },
  "chart-5": { bg: "bg-chart-5/10", icon: "text-chart-5" },
  warning: { bg: "bg-warning/15", icon: "text-warning-foreground" },
};
