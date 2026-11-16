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
 * section they may not open. The бухгалтер works from reports. */
export function homePathForRole(role: Role | undefined): string {
  return role === "FINANCE" ? "/reports" : "/dashboard";
}

/** Sections a role is narrowed to; a role absent here may open them all.
 * The owner and the manager run only the cash book — a deliberate UI
 * narrowing (the backend still lets them read everything); the warehouse
 * belongs to the кладовщик. */
const CASH_ONLY_PATHS = ["/dashboard", "/finance", "/profile"];
const ROLE_PATHS: Partial<Record<Role, string[]>> = {
  OWNER: CASH_ONLY_PATHS,
  PROJECT_MANAGER: CASH_ONLY_PATHS,
};

export function isPathAllowed(role: Role | undefined, pathname: string): boolean {
  const paths = role ? ROLE_PATHS[role] : undefined;
  if (!paths) return true;
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
