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
import { useWriteOff, useCancelWriteOff } from "@/lib/query/hooks/use-write-offs";
import { useIdempotencyKey } from "@/lib/idempotency";
import { formatBusinessDate, formatDateTime } from "@/lib/format/date";
import { formatQuantity } from "@/lib/format/decimal";
import { getErrorMessage } from "@/lib/errors/map";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";

export function WriteOffDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);
  const { data, isLoading, isError, error, refetch } = useWriteOff(id);
  const cancelMutation = useCancelWriteOff();
  const { key, renew } = useIdempotencyKey();
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;
  if (isError || !data) return <ErrorState error={error} onRetry={() => refetch()} />;

  const canCancel = canMutate && !data.cancelledAt;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-semibold">Списание материала</h1>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="text-center">
            <p className="text-2xl font-semibold">{formatQuantity(data.quantity)}</p>
            <p className="text-sm text-muted-foreground">{data.materialNameSnapshot}</p>
          </div>

          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Склад</dt>
            <dd className="text-right">{data.warehouseNameSnapshot}</dd>

            <dt className="text-muted-foreground">Объект</dt>
            <dd className="text-right">
              {data.blockNameSnapshot} / {data.floorLabelSnapshot ?? "весь блок"}
            </dd>

            <dt className="text-muted-foreground">Дата</dt>
            <dd className="text-right">{formatBusinessDate(data.occurredAt)}</dd>

            <dt className="text-muted-foreground">Себестоимость</dt>
            <dd className="text-right">
              <MoneyText value={data.totalCostUzs} currency="UZS" />
            </dd>

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
                <dt className="text-muted-foreground">Причина</dt>
                <dd className="text-right">{data.cancellationReason}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      {canCancel && (
        <Button variant="destructive" className="w-full" onClick={() => setCancelOpen(true)}>
          <Ban className="size-4" />
          Отменить списание
        </Button>
      )}

      <ConfirmReasonDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Отменить списание"
        confirmLabel="Отменить"
        isSubmitting={cancelMutation.isPending}
        onConfirm={(reason) => {
          cancelMutation.mutate(
            { id, reason, idempotencyKey: key },
            {
              onSuccess: () => {
                renew();
                setCancelOpen(false);
                toast.success("Списание отменено");
              },
              onError: (err) => toast.error(getErrorMessage(err)),
            },
          );
        }}
      />
    </div>
  );
}
