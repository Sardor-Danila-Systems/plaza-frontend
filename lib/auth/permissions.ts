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

/** Construction objects and anything not covered by the two below. */
export function canMutateProject(role: Role | undefined): boolean {
  return role === "PROJECT_MANAGER" || role === "DEVELOPER" || role === "OWNER";
}

/** Suppliers, their payments and advances, purchases. */
export function canMutateFinance(role: Role | undefined): boolean {
  return canMutateProject(role) || role === "FINANCE";
}

/** Posting, cancelling and commenting on cash operations (Касса). */
export function canPostCash(role: Role | undefined): boolean {
  return canMutateFinance(role);
}

/** Warehouses, materials, write-offs, transfers. */
export function canMutateInventory(role: Role | undefined): boolean {
  return canMutateProject(role) || role === "WAREHOUSE";
}

/** Where a user lands after login, and where they are sent back to from a
 * section they may not open. The storekeeper has no dashboard — it is made
 * of cash and supplier figures they may not see. */
export function homePathForRole(role: Role | undefined): string {
  return role === "WAREHOUSE" ? "/warehouses" : "/dashboard";
}

/** Sections a role is narrowed to; a role absent here may open them all.
 * For the owner this is a deliberate UI narrowing (the backend lets it read
 * everything); for the storekeeper it mirrors the backend, which denies
 * every cash and supplier endpoint. */
const ROLE_PATHS: Partial<Record<Role, string[]>> = {
  OWNER: ["/dashboard", "/finance", "/suppliers", "/purchases", "/history", "/settings/construction", "/profile"],
  WAREHOUSE: ["/warehouses", "/materials", "/write-offs", "/settings/construction", "/profile"],
};

export function isPathAllowed(role: Role | undefined, pathname: string): boolean {
  const paths = role ? ROLE_PATHS[role] : undefined;
  if (!paths) return true;
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
