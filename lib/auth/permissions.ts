import type { Role } from "@/lib/api/types";

/**
 * Frontend-only UX gating — hides/disables actions the backend would reject
 * anyway. The backend remains the sole authority; this never substitutes
 * for its own role/project checks (docs/frontend-integration.md's "Roles
 * And Access").
 */

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Владелец",
  ACCOUNTANT: "Бухгалтер",
  PROJECT_MANAGER: "Менеджер проекта",
  DEVELOPER: "Разработчик",
  FINANCE: "Финансы",
  WAREHOUSE: "Склад",
};

/** Roles bound to exactly one project — they never switch projects. */
export function isProjectScoped(role: Role | undefined): boolean {
  return role === "PROJECT_MANAGER" || role === "FINANCE" || role === "WAREHOUSE";
}

/** Construction objects (blocks, floors). */
export function canMutateProject(role: Role | undefined): boolean {
  return role === "WAREHOUSE" || role === "DEVELOPER";
}

/** Suppliers, their payments and advances, purchases. */
export function canMutateFinance(role: Role | undefined): boolean {
  return role === "WAREHOUSE" || role === "DEVELOPER";
}

/** Posting, cancelling and commenting on cash operations (Касса) —
 * the owner's and the manager's job. */
export function canPostCash(role: Role | undefined): boolean {
  return role === "OWNER" || role === "PROJECT_MANAGER" || role === "DEVELOPER";
}

/** Warehouses, materials, write-offs, transfers. */
export function canMutateInventory(role: Role | undefined): boolean {
  return role === "WAREHOUSE" || role === "DEVELOPER";
}

/** Where a user lands after login, and where they are sent back to from a
 * section they may not open. The бухгалтер works from reports, the
 * кладовщик from the warehouse (the dashboard is cash figures). */
export function homePathForRole(role: Role | undefined): string {
  if (role === "FINANCE") return "/reports";
  if (role === "WAREHOUSE") return "/warehouses";
  return "/dashboard";
}

/** Sections a role is narrowed to; a role absent here may open them all.
 * A deliberate UI split (the backend still lets each of them read the whole
 * project): the owner and the manager see the money side and post cash, the
 * кладовщик sees the warehouse side — no Касса, dashboard, analytics or
 * reports. */
const MONEY_SIDE_PATHS = [
  "/dashboard",
  "/analytics",
  "/finance",
  "/suppliers",
  "/purchases",
  "/history",
  "/audit",
  "/reports",
  "/settings/construction",
  "/profile",
];
const WAREHOUSE_SIDE_PATHS = [
  "/warehouses",
  "/materials",
  "/write-offs",
  "/suppliers",
  "/purchases",
  "/settings/construction",
  "/profile",
];
const ROLE_PATHS: Partial<Record<Role, string[]>> = {
  OWNER: MONEY_SIDE_PATHS,
  PROJECT_MANAGER: MONEY_SIDE_PATHS,
  WAREHOUSE: WAREHOUSE_SIDE_PATHS,
};

/** Demo replies instead of the backend, for building the UI before the
 * Claude API key exists; the assistant page shows a banner while it is on. */
export const ASSISTANT_MOCK = process.env.NEXT_PUBLIC_ASSISTANT_MOCK === "1";

/** The assistant appears only once the backend has its key (or in demo mode). */
const ASSISTANT_ENABLED = ASSISTANT_MOCK || process.env.NEXT_PUBLIC_ASSISTANT_ENABLED === "1";

/** Mirrors plaza-api's @Roles on /assistant. */
export function canUseAssistant(role: Role | undefined): boolean {
  return ASSISTANT_ENABLED && (role === "OWNER" || role === "DEVELOPER" || role === "ACCOUNTANT");
}

export function isPathAllowed(role: Role | undefined, pathname: string): boolean {
  if (pathname === "/assistant" || pathname.startsWith("/assistant/")) return canUseAssistant(role);
  const paths = role ? ROLE_PATHS[role] : undefined;
  if (!paths) return true;
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
