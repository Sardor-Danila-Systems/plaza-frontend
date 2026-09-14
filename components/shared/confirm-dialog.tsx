"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";

/** Confirmation dialog that collects a required reason — used for every
 * cancel action (finance/purchase/write-off/transfer all require `reason`). */
export function ConfirmReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Подтвердить",
  isSubmitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  isSubmitting?: boolean;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Причина</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Укажите причину отмены"
            rows={3}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={!reason.trim() || isSubmitting}
            onClick={() => onConfirm(reason.trim())}
          >
            {isSubmitting ? "…" : confirmLabel}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
