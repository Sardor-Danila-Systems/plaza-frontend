import { apiFetch } from "@/lib/api/client";
import type {
  Balance,
  CreatableTransactionType,
  Currency,
  CurrencyRate,
  FinancialTransaction,
  LiveCurrencyRate,
  Paginated,
  RateSource,
  TransactionCategory,
} from "@/lib/api/types";

export interface CreateFinancialTransactionInput {
  type: CreatableTransactionType;
  amount: string;
  currency: Currency;
  exchangeRate?: string;
  currencyRateId?: string;
  rateOverrideReason?: string;
  categoryId?: string;
  source?: string;
  recipient?: string;
  comment?: string;
  occurredAt: string;
}

export interface ListFinanceFilters {
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  categoryId?: string;
  currency?: Currency;
  includeCancelled?: boolean;
  page?: number;
  pageSize?: number;
}

export const financesApi = {
  balance: (projectId: string) =>
    apiFetch<Balance>(`/projects/${projectId}/finances/balance`),

  list: (projectId: string, filters: ListFinanceFilters) =>
    apiFetch<Paginated<FinancialTransaction>>(`/projects/${projectId}/finances`, {
      query: filters as Record<string, string | number | boolean | undefined>,
    }),

  get: (projectId: string, id: string) =>
    apiFetch<FinancialTransaction>(`/projects/${projectId}/finances/${id}`),

  create: (projectId: string, body: CreateFinancialTransactionInput, idempotencyKey: string) =>
    apiFetch<FinancialTransaction>(`/projects/${projectId}/finances`, {
      method: "POST",
      body,
      idempotencyKey,
    }),

  editComment: (projectId: string, id: string, comment: string) =>
    apiFetch<FinancialTransaction>(`/projects/${projectId}/finances/${id}`, {
      method: "PATCH",
      body: { comment },
    }),

  cancel: (projectId: string, id: string, reason: string, idempotencyKey: string) =>
    apiFetch<FinancialTransaction>(`/projects/${projectId}/finances/${id}/cancel`, {
      method: "POST",
      body: { reason },
      idempotencyKey,
    }),

  categories: (projectId: string) =>
    apiFetch<TransactionCategory[]>(`/projects/${projectId}/transaction-categories`),

  createCategory: (
    projectId: string,
    body: { name: string; kind: TransactionCategory["kind"] },
  ) =>
    apiFetch<TransactionCategory>(`/projects/${projectId}/transaction-categories`, {
      method: "POST",
      body,
    }),

  currencyRates: (projectId: string) =>
    apiFetch<CurrencyRate[]>(`/projects/${projectId}/currency-rates`),

  liveCurrencyRate: (projectId: string) =>
    apiFetch<LiveCurrencyRate>(`/projects/${projectId}/currency-rates/live`),

  createCurrencyRate: (
    projectId: string,
    body: { currency: Currency; rateUzs: string; effectiveOn: string; source?: RateSource },
  ) =>
    apiFetch<CurrencyRate>(`/projects/${projectId}/currency-rates`, {
      method: "POST",
      body,
    }),
};
