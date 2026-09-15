import type { SupplierAdvance } from "@/lib/api/types";

/**
 * The backend exposes no `GET .../advances` list endpoint (confirmed against
 * plaza-api/src/modules/suppliers/advances/supplier-advances.controller.ts —
 * POST only). A purchase's `advanceAllocations` still needs concrete advance
 * ids to allocate, so this tracks advances created through this app,
 * persisted locally per supplier. This is a workaround for a real contract
 * gap, not an invented backend endpoint: the supplier ledger's aggregate
 * `availableAdvance` total (by currency) is always shown alongside it for
 * full visibility, and this list only ever grows from advances this browser
 * itself created.
 *
 * Re-verified against the final (Phase 13) backend: `supplier-advances.
 * controller.ts` still declares exactly one route (`POST`). The only
 * server-side enumeration of a supplier's advances is
 * `GET .../reports/advances.xlsx` — a binary export, not usable for a
 * picker. This remains the one real reportable backend integration gap.
 */
const STORAGE_PREFIX = "plaza:known-advances:";

function storageKey(supplierId: string): string {
  return `${STORAGE_PREFIX}${supplierId}`;
}

export function readKnownAdvances(supplierId: string): SupplierAdvance[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(supplierId));
    return raw ? (JSON.parse(raw) as SupplierAdvance[]) : [];
  } catch {
    return [];
  }
}

export function rememberAdvance(supplierId: string, advance: SupplierAdvance): void {
  if (typeof window === "undefined") return;
  const existing = readKnownAdvances(supplierId).filter((a) => a.id !== advance.id);
  const next = [advance, ...existing];
  localStorage.setItem(storageKey(supplierId), JSON.stringify(next));
}

/** After a debt payment or purchase consumes an advance, its availableAmount
 * is stale in this local cache — drop entries whose consumption we can't
 * track precisely rather than showing a wrong number silently is not
 * possible client-side, so callers should refetch the ledger for the
 * authoritative aggregate and treat this list as "candidates to allocate",
 * letting the server reject an over-allocated amount. */
