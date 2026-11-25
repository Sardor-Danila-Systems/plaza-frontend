import type {
  AssistantReply,
  AssistantTurn,
  ConfirmedTransaction,
  PendingAction,
  ProposedTransaction,
} from "@/lib/api/assistant";

/**
 * Demo backend for the assistant page. Every figure here is invented; the
 * page labels the whole conversation as a demo while this runs.
 */

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseAmount(text: string): string | null {
  const match = text.match(/(\d[\d\s]*(?:[.,]\d+)?)\s*(млн|миллион|тыс|k)?/i);
  if (!match) return null;
  let value = Number(match[1].replace(/\s/g, "").replace(",", "."));
  const unit = match[2]?.toLowerCase();
  if (unit?.startsWith("млн") || unit?.startsWith("миллион")) value *= 1_000_000;
  if (unit?.startsWith("тыс") || unit === "k") value *= 1_000;
  return Number.isFinite(value) && value > 0 ? value.toFixed(2) : null;
}

function proposal(text: string, projectId: string): PendingAction | null {
  const amount = parseAmount(text);
  if (!amount) return null;
  const isIncome = /приход|поступ|получил|внес/i.test(text);
  const payload: ProposedTransaction = {
    type: isIncome ? "INCOME" : "EXPENSE",
    amount,
    currency: /\$|долл|usd/i.test(text) ? "USD" : "UZS",
    account: /банк|перечисл/i.test(text) ? "BANK" : "CASH",
    occurredAt: today(),
    ...(isIncome ? { source: "Инвестор" } : { recipient: "ООО «БетонСтрой»" }),
    comment: text.slice(0, 120),
  };
  return {
    id: crypto.randomUUID(),
    kind: "CREATE_FINANCIAL_TRANSACTION",
    projectId,
    summary: `${isIncome ? "Приход" : "Расход"} ${amount} ${payload.currency}`,
    payload,
    token: "mock-token",
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  };
}

export async function mockAssistantChat(
  messages: AssistantTurn[],
  projectId: string | null,
  signal?: AbortSignal,
): Promise<AssistantReply> {
  await wait(900 + Math.random() * 700, signal);
  const question = messages[messages.length - 1]?.text ?? "";

  if (/запиш|провед|оформ|внеси|добав/i.test(question) && projectId) {
    const action = proposal(question, projectId);
    if (action) {
      return {
        reply:
          "Подготовил операцию. Проверьте данные на карточке и подтвердите — без подтверждения ничего не записывается.",
        pendingActions: [action],
        toolsUsed: ["list_transaction_categories", "propose_financial_transaction"],
      };
    }
    return {
      reply: "Какую сумму записать? Например: «Запиши расход 12 млн за бетон».",
      pendingActions: [],
      toolsUsed: [],
    };
  }

  if (/долг|долж|поставщик/i.test(question)) {
    return {
      reply:
        "Долг поставщикам по проекту — **184 500 000 сум**.\n\n- ООО «БетонСтрой» — 96 000 000 сум, самая старая закупка 3 недели назад\n- «Арматура Сервис» — 61 200 000 сум\n- ИП Каримов — 27 300 000 сум\n\nАвансов, не закрытых поставками, — 12 000 000 сум у «Арматура Сервис».",
      pendingActions: [],
      toolsUsed: ["list_suppliers", "get_supplier_ledger", "get_supplier_ledger"],
    };
  }

  if (/склад|материал|остат|цемент|арматур/i.test(question)) {
    return {
      reply:
        "На складах 14 позиций, на сумму **412 800 000 сум**. Ниже минимума три:\n\n- Цемент М400 — 38 мешков (минимум 100)\n- Арматура Ø12 — 1,2 т (минимум 3 т)\n- Кирпич облицовочный — 2 400 шт (минимум 5 000)",
      pendingActions: [],
      toolsUsed: ["get_inventory"],
    };
  }

  return {
    reply:
      "В кассе сейчас **1 284 000 000 сум** и **$46 200**.\n\nЗа этот месяц:\n- приход — 2 150 000 000 сум\n- расход — 1 732 400 000 сум, из них закупки 1 104 000 000 сум\n\nКрупнейший расход — оплата ООО «БетонСтрой», 312 000 000 сум.",
    pendingActions: [],
    toolsUsed: ["get_cash_balance", "get_project_summary"],
  };
}

export async function mockConfirmAction(action: PendingAction): Promise<ConfirmedTransaction> {
  await wait(600);
  return { id: action.id, projectId: action.projectId };
}
