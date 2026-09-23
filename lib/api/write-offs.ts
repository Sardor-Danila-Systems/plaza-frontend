import { apiFetch } from "@/lib/api/client";
import type { Paginated, WriteOff } from "@/lib/api/types";

export interface CreateWriteOffInput {
  warehouseId: string;
  materialId: string;
  blockId: string;
  /** Omitted for material consumed by the whole block rather than one
   * floor — see StockWriteOff.floorId in the API's schema. */
  floorId?: string;
  quantity: string;
  comment?: string;
  occurredAt: string;
}

export interface ListWriteOffsFilters {
  warehouseId?: string;
  materialId?: string;
  blockId?: string;
  floorId?: string;
  dateFrom?: string;
  dateTo?: string;
  includeCancelled?: boolean;
  page?: number;
  pageSize?: number;
}

export const writeOffsApi = {
  list: (projectId: string, filters: ListWriteOffsFilters) =>
    apiFetch<Paginated<WriteOff>>(`/projects/${projectId}/inventory/write-offs`, {
      query: filters as Record<string, string | number | boolean | undefined>,
    }),

  get: (projectId: string, id: string) =>
    apiFetch<WriteOff>(`/projects/${projectId}/inventory/write-offs/${id}`),

  create: (projectId: string, body: CreateWriteOffInput, idempotencyKey: string) =>
    apiFetch<WriteOff>(`/projects/${projectId}/inventory/write-offs`, {
      method: "POST",
      body,
      idempotencyKey,
    }),

  cancel: (projectId: string, id: string, reason: string, idempotencyKey: string) =>
    apiFetch<WriteOff>(`/projects/${projectId}/inventory/write-offs/${id}/cancel`, {
      method: "POST",
      body: { reason },
      idempotencyKey,
    }),
};
