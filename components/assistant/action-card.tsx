"use client";

import { ArrowDownCircle, ArrowUpCircle, Check, Loader2, X } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PendingAction } from "@/lib/api/assistant";
import { CASH_ACCOUNT_LABELS } from "@/lib/api/types";
import { formatBusinessDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/decimal";

export type ActionStatus = "pending" | "confirming" | "confirmed" | "rejected" | "failed";

export interface ActionState {
  action: PendingAction;
  status: ActionStatus;
  error?: string;
  /** Set once confirmed: the ledger entry the confirmation created. */
  transactionId?: string;
}

const STATUS_BADGE: Record<ActionStatus, { label: string; variant: "warning" | "success" | "secondary" | "destructive" }> = {
  pending: { label: "Ждёт подтверждения", variant: "warning" },
  confirming: { label: "Записываю…", variant: "warning" },
  confirmed: { label: "Записано", variant: "success" },
  rejected: { label: "Отклонено", variant: "secondary" },
  failed: { label: "Не записано", variant: "destructive" },
};

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function ActionCard({
  state,
  projectName,
  expired,
  onConfirm,
  onReject,
  onOpen,
}: {
  state: ActionState;
  projectName?: string;
  expired: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onOpen?: () => void;
}) {
  const { action, status, error } = state;
  const p = action.payload;
  const income = p.type === "INCOME";
  const Icon = income ? ArrowDownCircle : ArrowUpCircle;
  const open = status === "pending" && !expired;
  const badge = status === "pending" && expired ? { label: "Срок истёк", variant: "secondary" as const } : STATUS_BADGE[status];

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-[0_1px_2px_oklch(0.22_0.012_55/0.04)] transition-opacity",
        (status === "rejected" || (status === "pending" && expired)) && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2.5">
          <Icon className={cn("size-5 shrink-0", income ? "text-success" : "text-destructive")} aria-hidden />
          <div>
            <p className="text-sm font-medium text-foreground">{income ? "Приход" : "Расход"} в кассу</p>
            <p className="whitespace-nowrap text-lg font-semibold tabular-nums tracking-tight text-foreground">
              {income ? "+" : "−"}
              {formatMoney(p.amount, p.currency)}
            </p>
          </div>
        </div>
        <Badge variant={badge.variant} className="shrink-0">
          {badge.label}
        </Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Field label="Проект" value={projectName} />
        <Field label="Счёт" value={CASH_ACCOUNT_LABELS[p.account ?? "CASH"]} />
        <Field label="Дата" value={formatBusinessDate(p.occurredAt)} />
        <Field label={income ? "От кого" : "Кому"} value={income ? p.source : p.recipient} />
        {p.comment && (
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-xs text-muted-foreground">Комментарий</dt>
            <dd className="mt-0.5 text-sm text-foreground">{p.comment}</dd>
          </div>
        )}
      </dl>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {(open || status === "confirming" || status === "failed") && !expired && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
          <Button size="sm" className="h-8 gap-1.5" onClick={onConfirm} disabled={status === "confirming"}>
            {status === "confirming" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            {status === "failed" ? "Повторить" : "Подтвердить"}
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onReject} disabled={status === "confirming"}>
            <X className="size-3.5" />
            Отклонить
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            Действует до{" "}
            {new Date(action.expiresAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      )}

      {status === "pending" && expired && (
        <p className="mt-3 text-xs text-muted-foreground">Попросите ассистента подготовить операцию заново.</p>
      )}

      {status === "confirmed" && onOpen && (
        <div className="mt-4 border-t pt-3">
          <Button size="sm" variant="outline" className="h-8" onClick={onOpen}>
            Открыть операцию
          </Button>
        </div>
      )}
    </div>
  );
}
