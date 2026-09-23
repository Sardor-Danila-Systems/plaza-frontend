import { Badge } from "@/components/ui/badge";
import type { PurchaseStatus } from "@/lib/api/types";

const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  UNPAID: "Не оплачено",
  PARTIALLY_PAID: "Частично оплачено",
  PAID: "Оплачено",
  CANCELLED: "Отменено",
};

const PURCHASE_STATUS_VARIANT: Record<PurchaseStatus, "success" | "warning" | "destructive" | "secondary"> = {
  UNPAID: "destructive",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  CANCELLED: "secondary",
};

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  return <Badge variant={PURCHASE_STATUS_VARIANT[status]}>{PURCHASE_STATUS_LABELS[status]}</Badge>;
}

export function CancelledBadge() {
  return <Badge variant="secondary">Отменено</Badge>;
}
