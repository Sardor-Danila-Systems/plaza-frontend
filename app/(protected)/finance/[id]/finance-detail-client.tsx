"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { MoneyText } from "@/components/shared/money-text";
import { ConfirmReasonDialog } from "@/components/shared/confirm-dialog";
import { useFinanceDetail, useCancelFinanceTransaction } from "@/lib/query/hooks/use-finance";
import { useIdempotencyKey } from "@/lib/idempotency";
import { formatBusinessDate, formatDateTime } from "@/lib/format/date";
import { getErrorMessage } from "@/lib/errors/map";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Доход",
  EXPENSE: "Расход",
  SALARY: "Зарплата",
  PURCHASE: "Закупка",
  ADVANCE: "Аванс",
  DEBT_PAYMENT: "Оплата долга",
  REFUND: "Возврат",
  ADJUSTMENT: "Корректировка",
};

export function FinanceDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useFinanceDetail(id);
  const cancelMutation = useCancelFinanceTransaction();
  const { key, renew } = useIdempotencyKey();
  const [cancelOpen, setCancelOpen] = useState(false);

  const canMutate = canMutateProject(user?.role);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (isError || !data) return <ErrorState error={error} onRetry={() => refetch()} />;

  const canCancel = canMutate && !data.cancelledAt;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold">{TYPE_LABELS[data.type] ?? data.type}</h1>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="text-center">
            <MoneyText
              value={data.amount}
              currency={data.currency}
              direction={data.direction}
              className="text-3xl"
            />
            {data.currency === "USD" && (
              <p className="mt-1 text-sm text-muted-foreground">
                ≈ {new Intl.NumberFormat("ru-RU").format(Number(data.amountUzs))} сум по {data.exchangeRate}
              </p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Дата</dt>
            <dd className="text-right">{formatBusinessDate(data.occurredAt)}</dd>

            {data.categoryNameSnapshot && (
              <>
                <dt className="text-muted-foreground">Категория</dt>
                <dd className="text-right">{data.categoryNameSnapshot}</dd>
              </>
            )}

            {data.recipient && (
              <>
                <dt className="text-muted-foreground">
                  {data.type === "INCOME" ? "Источник" : "Получатель"}
                </dt>
                <dd className="text-right">{data.recipient}</dd>
              </>
            )}

            {data.comment && (
              <>
                <dt className="text-muted-foreground">Комментарий</dt>
                <dd className="text-right">{data.comment}</dd>
              </>
            )}

            <dt className="text-muted-foreground">Создано</dt>
            <dd className="text-right">{formatDateTime(data.createdAt)}</dd>

            {data.cancelledAt && (
              <>
                <dt className="text-muted-foreground">Отменено</dt>
                <dd className="text-right">{formatDateTime(data.cancelledAt)}</dd>
                <dt className="text-muted-foreground">Причина отмены</dt>
                <dd className="text-right">{data.cancellationReason}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      {canCancel && (
        <Button variant="destructive" className="w-full" onClick={() => setCancelOpen(true)}>
          <Ban className="size-4" />
          Отменить операцию
        </Button>
      )}

      <ConfirmReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Отменить операцию"
        description="Действие необратимо. Укажите причину отмены."
        confirmLabel="Отменить"
        isSubmitting={cancelMutation.isPending}
        onConfirm={(reason) => {
          cancelMutation.mutate(
            { id, reason, idempotencyKey: key },
            {
              onSuccess: () => {
                renew();
                setCancelOpen(false);
                toast.success("Операция отменена");
              },
              onError: (err) => toast.error(getErrorMessage(err)),
            },
          );
        }}
      />
    </div>
  );
}
