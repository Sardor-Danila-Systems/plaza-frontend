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
  CASHIER: "Кассир",
  DEVELOPER: "Разработчик",
};

/** Anything outside the cash ledger: suppliers, purchases, the warehouse,
 * construction objects. */
export function canMutateProject(role: Role | undefined): boolean {
  return role === "PROJECT_MANAGER" || role === "DEVELOPER";
}

/** Posting, cancelling and commenting on cash operations (Касса). */
export function canPostCash(role: Role | undefined): boolean {
  return role === "PROJECT_MANAGER" || role === "CASHIER" || role === "DEVELOPER";
}

/** A cashier works in Касса only — every other section is closed to them
 * server-side, so the UI does not offer it at all. */
export function isCashOnly(role: Role | undefined): boolean {
  return role === "CASHIER";
}

/** Where a role lands after login, and where it is sent back to from a
 * section it may not open. */
export function homePathForRole(role: Role | undefined): string {
  return isCashOnly(role) ? "/finance" : "/dashboard";
}

const CASH_ONLY_PATHS = ["/finance", "/profile"];

export function isPathAllowed(role: Role | undefined, pathname: string): boolean {
  if (!isCashOnly(role)) return true;
  return CASH_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
