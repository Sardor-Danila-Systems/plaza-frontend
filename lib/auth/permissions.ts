import type { Role } from "@/lib/api/types";

/**
 * Frontend-only UX gating — hides/disables actions the backend would reject
 * anyway. The backend remains the sole authority; this never substitutes
 * for its own role/project checks (docs/frontend-integration.md's "Roles
 * And Access").
 */
export function canMutateProject(role: Role | undefined): boolean {
  return role === "PROJECT_MANAGER";
}
