"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { useCreateSupplier } from "@/lib/query/hooks/use-suppliers";
import { getErrorMessage } from "@/lib/errors/map";
import type { Supplier } from "@/lib/api/types";

/** Shared between the suppliers list and any form that needs a supplier
 * that doesn't exist yet (the purchase form) — `onCreated` lets the caller
 * select the new supplier straight away instead of sending the user off to
 * another section and back. */
export function CreateSupplierDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (supplier: Supplier) => void;
}) {
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const createMutation = useCreateSupplier();

  const reset = () => {
    setName("");
    setContactPerson("");
    setPhone("");
    setComment("");
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Новый поставщик">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          createMutation.mutate(
            {
              name: name.trim(),
              contactPerson: contactPerson.trim() || undefined,
              phone: phone.trim() || undefined,
              comment: comment.trim() || undefined,
            },
            {
              onSuccess: (supplier) => {
                toast.success("Поставщик добавлен");
                reset();
                onOpenChange(false);
                onCreated?.(supplier);
              },
              onError: (err) => toast.error(getErrorMessage(err)),
            },
          );
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="supplier-name">Название</Label>
          <Input id="supplier-name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier-contact">Контактное лицо</Label>
          <Input
            id="supplier-contact"
            className="h-11"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier-phone">Телефон</Label>
          <PhoneInput id="supplier-phone" className="h-11" value={phone} onValueChange={setPhone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier-comment">Комментарий</Label>
          <Textarea id="supplier-comment" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={!name.trim() || createMutation.isPending}>
          {createMutation.isPending ? "Сохранение…" : "Добавить"}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
