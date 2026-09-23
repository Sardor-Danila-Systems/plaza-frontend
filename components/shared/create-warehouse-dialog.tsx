"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { useCreateWarehouse } from "@/lib/query/hooks/use-inventory";
import { getErrorMessage } from "@/lib/errors/map";
import { normalizeCodeInput, slugify } from "@/lib/format/slug";
import type { Warehouse } from "@/lib/api/types";

/** Shared between the warehouses list and the purchase form — see
 * CreateSupplierDialog for why `onCreated` exists. */
export function CreateWarehouseDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (warehouse: Warehouse) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  // Once the code has been typed by hand, the name stops overwriting it.
  const [codeEdited, setCodeEdited] = useState(false);
  const [comment, setComment] = useState("");
  const createMutation = useCreateWarehouse();

  const reset = () => {
    setName("");
    setCode("");
    setCodeEdited(false);
    setComment("");
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Новый склад">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !code.trim()) return;
          createMutation.mutate(
            { name: name.trim(), code: code.trim(), comment: comment.trim() || undefined },
            {
              onSuccess: (warehouse) => {
                toast.success("Склад создан");
                reset();
                onOpenChange(false);
                onCreated?.(warehouse);
              },
              onError: (err) => toast.error(getErrorMessage(err)),
            },
          );
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="wh-name">Название</Label>
          <Input
            id="wh-name"
            className="h-11"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!codeEdited) setCode(slugify(e.target.value));
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wh-code">Код (латиницей, например main)</Label>
          <Input
            id="wh-code"
            className="h-11"
            value={code}
            onChange={(e) => {
              setCodeEdited(true);
              setCode(normalizeCodeInput(e.target.value));
            }}
            placeholder="main"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wh-comment">Комментарий</Label>
          <Textarea id="wh-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <Button
          type="submit"
          className="h-11 w-full"
          disabled={!name.trim() || !code.trim() || createMutation.isPending}
        >
          {createMutation.isPending ? "Сохранение…" : "Создать"}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
