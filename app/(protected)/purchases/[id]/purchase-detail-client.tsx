"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Decimal from "decimal.js";
import { toast } from "sonner";
import { ArrowLeft, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { MoneyText } from "@/components/shared/money-text";
import { PurchaseStatusBadge } from "@/components/shared/status-badge";
import { ConfirmReasonDialog } from "@/components/shared/confirm-dialog";
import { usePurchase, useCancelPurchase } from "@/lib/query/hooks/use-purchases";
import { useIdempotencyKey } from "@/lib/idempotency";
import { formatBusinessDate, formatDateTime } from "@/lib/format/date";
import { formatQuantity } from "@/lib/format/decimal";
import { getErrorMessage } from "@/lib/errors/map";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";

export function PurchaseDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);
  const { data, isLoading, isError, error, refetch } = usePurchase(id);
  const cancelMutation = useCancelPurchase();
  const { key, renew } = useIdempotencyKey();
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (isError || !data) return <ErrorState error={error} onRetry={() => refetch()} />;

  const canCancel = canMutate && data.status !== "CANCELLED";
  const settled = new Decimal(data.totalAmount).minus(data.remainingDebt).toString();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="flex-1 truncate text-lg font-semibold">{data.supplierNameSnapshot}</h1>
        <PurchaseStatusBadge status={data.status} />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Склад</dt>
            <dd className="text-right">{data.warehouseNameSnapshot}</dd>

            <dt className="text-muted-foreground">Дата</dt>
            <dd className="text-right">{formatBusinessDate(data.occurredAt)}</dd>

            {data.invoiceNumber && (
              <>
                <dt className="text-muted-foreground">№ накладной</dt>
                <dd className="text-right">{data.invoiceNumber}</dd>
              </>
            )}

            {data.currency === "USD" && (
              <>
                <dt className="text-muted-foreground">Курс</dt>
                <dd className="text-right">{data.exchangeRate}</dd>
              </>
            )}
          </dl>

          <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Итого</span>
              <MoneyText value={data.totalAmount} currency={data.currency} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Оплачено (аванс + касса)</span>
              <MoneyText value={settled} currency={data.currency} />
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Остаток долга</span>
              <MoneyText value={data.remainingDebt} currency={data.currency} />
            </div>
          </div>

          {data.comment && <p className="text-sm">{data.comment}</p>}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Материалы</h2>
        <div className="divide-y overflow-hidden rounded-lg border bg-card">
          {data.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.materialNameSnapshot}</p>
                <p className="text-xs text-muted-foreground">
                  {formatQuantity(item.quantity)} × {item.unitPrice}
                </p>
              </div>
              <MoneyText value={item.lineAmount} currency={data.currency} />
            </div>
          ))}
        </div>
      </div>

      {data.cancelledAt && (
        <Card>
          <CardContent className="space-y-2 pt-4 text-sm">
            <p className="text-muted-foreground">Отменена {formatDateTime(data.cancelledAt)}</p>
            <p>{data.cancellationReason}</p>
          </CardContent>
        </Card>
      )}

      {canCancel && (
        <Button variant="destructive" className="w-full" onClick={() => setCancelOpen(true)}>
          <Ban className="size-4" />
          Отменить закупку
        </Button>
      )}

      <ConfirmReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Отменить закупку"
        confirmLabel="Отменить"
        isSubmitting={cancelMutation.isPending}
        onConfirm={(reason) => {
          cancelMutation.mutate(
            { id, reason, idempotencyKey: key },
            {
              onSuccess: () => {
                renew();
                setCancelOpen(false);
                toast.success("Закупка отменена");
              },
              onError: (err) => {
                toast.error(getErrorMessage(err));
                setCancelOpen(false);
              },
            },
          );
        }}
      />
    </div>
  );
}
