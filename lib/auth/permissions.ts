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
};

/** Anything outside the cash ledger: suppliers, purchases, the warehouse,
 * construction objects. */
export function canMutateProject(role: Role | undefined): boolean {
  return role === "PROJECT_MANAGER" || role === "DEVELOPER";
}

/** Posting, cancelling and commenting on cash operations (Касса). */
export function canPostCash(role: Role | undefined): boolean {
  return canMutateProject(role);
}

/** Where a user lands after login, and where they are sent back to from a
 * section they may not open. */
export const HOME_PATH = "/dashboard";

/** The owner sees only these sections (read-only); every other role may
 * open all of them. The backend still allows the owner to read everything,
 * so this is a deliberate UI narrowing, not a security boundary. */
const OWNER_PATHS = ["/dashboard", "/finance", "/suppliers", "/purchases", "/history", "/settings/construction", "/profile"];

export function isPathAllowed(role: Role | undefined, pathname: string): boolean {
  if (role !== "OWNER") return true;
  return OWNER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
