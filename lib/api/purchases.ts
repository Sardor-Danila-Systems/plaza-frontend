import { apiFetch } from "@/lib/api/client";
import type {
  AdvanceAllocationInput,
  Currency,
  Paginated,
  Purchase,
  PurchaseItemInput,
} from "@/lib/api/types";

export interface CreatePurchaseInput {
  supplierId: string;
  warehouseId: string;
  currency: Currency;
  exchangeRate?: string;
  currencyRateId?: string;
  rateOverrideReason?: string;
  items: PurchaseItemInput[];
  advanceAllocations?: AdvanceAllocationInput[];
  cashPaid?: string;
  invoiceNumber?: string;
  comment?: string;
  occurredAt: string;
}

export interface ListPurchasesFilters {
  supplierId?: string;
  warehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
  includeCancelled?: boolean;
  page?: number;
  pageSize?: number;
}

export const purchasesApi = {
  list: (projectId: string, filters: ListPurchasesFilters) =>
    apiFetch<Paginated<Purchase>>(`/projects/${projectId}/purchases`, {
      query: filters as Record<string, string | number | boolean | undefined>,
    }),

  get: (projectId: string, id: string) =>
    apiFetch<Purchase>(`/projects/${projectId}/purchases/${id}`),

  create: (projectId: string, body: CreatePurchaseInput, idempotencyKey: string) =>
    apiFetch<Purchase>(`/projects/${projectId}/purchases`, {
      method: "POST",
      body,
      idempotencyKey,
    }),

  editComment: (projectId: string, id: string, comment: string) =>
    apiFetch<Purchase>(`/projects/${projectId}/purchases/${id}`, {
      method: "PATCH",
      body: { comment },
    }),

  cancel: (projectId: string, id: string, reason: string, idempotencyKey: string) =>
    apiFetch<Purchase>(`/projects/${projectId}/purchases/${id}/cancel`, {
      method: "POST",
      body: { reason },
      idempotencyKey,
    }),
};
