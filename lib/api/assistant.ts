import { apiFetch } from "@/lib/api/client";
import { mockAssistantChat, mockConfirmAction } from "@/lib/api/assistant-mock";
import { ASSISTANT_MOCK } from "@/lib/auth/permissions";
import type { CashAccount, Currency } from "@/lib/api/types";


export { ASSISTANT_MOCK };

export interface AssistantTurn {
  role: "user" | "assistant";
  text: string;
}

/** Payload of a proposed INCOME/EXPENSE, as plaza-api's
 * CreateFinancialTransactionDto takes it. */
export interface ProposedTransaction {
  type: "INCOME" | "EXPENSE";
  amount: string;
  currency: Currency;
  account?: CashAccount;
  categoryId?: string;
  source?: string;
  recipient?: string;
  comment?: string;
  occurredAt: string;
}

export interface PendingAction {
  id: string;
  kind: "CREATE_FINANCIAL_TRANSACTION";
  projectId: string;
  summary: string;
  payload: ProposedTransaction;
  token: string;
  expiresAt: string;
}

export interface AssistantReply {
  reply: string;
  pendingActions: PendingAction[];
  toolsUsed: string[];
}

export interface ConfirmedTransaction {
  id: string;
  projectId: string;
}

export function sendAssistantChat(
  messages: AssistantTurn[],
  currentProjectId: string | null,
  signal?: AbortSignal,
): Promise<AssistantReply> {
  if (ASSISTANT_MOCK) return mockAssistantChat(messages, currentProjectId, signal);
  return apiFetch<AssistantReply>("/assistant/chat", {
    method: "POST",
    body: { messages, currentProjectId: currentProjectId ?? undefined },
    signal,
  });
}

export function confirmAssistantAction(action: PendingAction): Promise<ConfirmedTransaction> {
  if (ASSISTANT_MOCK) return mockConfirmAction(action);
  return apiFetch<ConfirmedTransaction>("/assistant/actions/confirm", {
    method: "POST",
    body: { token: action.token },
  });
}

/** Tool names from plaza-api, in the words the owner uses. */
export const TOOL_LABELS: Record<string, string> = {
  list_projects: "проекты",
  get_project_summary: "сводка проекта",
  get_cash_balance: "баланс кассы",
  list_transactions: "операции кассы",
  list_transaction_categories: "категории",
  list_suppliers: "поставщики",
  get_supplier_ledger: "сверка с поставщиком",
  list_purchases: "закупки",
  get_inventory: "остатки склада",
  get_materials_analytics: "аналитика материалов",
  get_construction_analytics: "расход по блокам",
  propose_financial_transaction: "подготовка операции",
};
