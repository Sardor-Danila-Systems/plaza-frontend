import { apiFetch } from "@/lib/api/client";
import type { Paginated, Transfer } from "@/lib/api/types";

export interface CreateTransferInput {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  materialId: string;
  quantity: string;
  comment?: string;
  occurredAt: string;
}

export interface ListTransfersFilters {
  /** Matches either source or destination warehouse (backend has one filter, not two). */
  warehouseId?: string;
  materialId?: string;
  dateFrom?: string;
  dateTo?: string;
  includeCancelled?: boolean;
  page?: number;
  pageSize?: number;
}

export const transfersApi = {
  list: (projectId: string, filters: ListTransfersFilters) =>
    apiFetch<Paginated<Transfer>>(`/projects/${projectId}/inventory/transfers`, {
      query: filters as Record<string, string | number | boolean | undefined>,
    }),

  get: (projectId: string, id: string) =>
    apiFetch<Transfer>(`/projects/${projectId}/inventory/transfers/${id}`),

  create: (projectId: string, body: CreateTransferInput, idempotencyKey: string) =>
    apiFetch<Transfer>(`/projects/${projectId}/inventory/transfers`, {
      method: "POST",
      body,
      idempotencyKey,
    }),

  cancel: (projectId: string, id: string, reason: string, idempotencyKey: string) =>
    apiFetch<Transfer>(`/projects/${projectId}/inventory/transfers/${id}/cancel`, {
      method: "POST",
      body: { reason },
      idempotencyKey,
    }),
};
