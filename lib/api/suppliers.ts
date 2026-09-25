import { apiFetch } from "@/lib/api/client";
import type {
  Currency,
  Supplier,
  SupplierAdvance,
  SupplierLedger,
  SettlementAllocation,
} from "@/lib/api/types";

export interface CreateSupplierInput {
  name: string;
  contactPerson?: string;
  phone?: string;
  taxId?: string;
  comment?: string;
}

export interface UpdateSupplierInput {
  name?: string;
  contactPerson?: string;
  phone?: string;
  taxId?: string;
  comment?: string;
  isActive?: boolean;
}

export interface ListSuppliersFilters {
  search?: string;
  isActive?: boolean;
}

export interface CreateSupplierAdvanceInput {
  currency: Currency;
  amount: string;
  exchangeRate?: string;
  currencyRateId?: string;
  rateOverrideReason?: string;
  comment?: string;
  occurredAt: string;
}

export interface CreateDebtPaymentInput {
  purchaseId: string;
  currency: Currency;
  amount: string;
  exchangeRate?: string;
  currencyRateId?: string;
  rateOverrideReason?: string;
  settlementExchangeRate?: string;
  comment?: string;
  occurredAt: string;
}

export const suppliersApi = {
  list: (projectId: string, filters: ListSuppliersFilters = {}) =>
    apiFetch<Supplier[]>(`/projects/${projectId}/suppliers`, {
      query: filters as Record<string, string | boolean | undefined>,
    }),

  get: (projectId: string, id: string) =>
    apiFetch<Supplier>(`/projects/${projectId}/suppliers/${id}`),

  create: (projectId: string, body: CreateSupplierInput) =>
    apiFetch<Supplier>(`/projects/${projectId}/suppliers`, { method: "POST", body }),

  update: (projectId: string, id: string, body: UpdateSupplierInput) =>
    apiFetch<Supplier>(`/projects/${projectId}/suppliers/${id}`, {
      method: "PATCH",
      body,
    }),

  ledger: (projectId: string, id: string) =>
    apiFetch<SupplierLedger>(`/projects/${projectId}/suppliers/${id}/ledger`),

  listAdvances: (projectId: string, supplierId: string) =>
    apiFetch<SupplierAdvance[]>(`/projects/${projectId}/suppliers/${supplierId}/advances`),

  createAdvance: (
    projectId: string,
    supplierId: string,
    body: CreateSupplierAdvanceInput,
    idempotencyKey: string,
  ) =>
    apiFetch<SupplierAdvance>(`/projects/${projectId}/suppliers/${supplierId}/advances`, {
      method: "POST",
      body,
      idempotencyKey,
    }),

  createDebtPayment: (
    projectId: string,
    supplierId: string,
    body: CreateDebtPaymentInput,
    idempotencyKey: string,
  ) =>
    apiFetch<SettlementAllocation>(
      `/projects/${projectId}/suppliers/${supplierId}/debt-payments`,
      { method: "POST", body, idempotencyKey },
    ),
};
