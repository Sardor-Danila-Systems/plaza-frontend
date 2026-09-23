"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/masked-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useSuppliers, useCreateSupplier } from "@/lib/query/hooks/use-suppliers";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";
import { getErrorMessage } from "@/lib/errors/map";

export default function SuppliersPage() {
  const { data, isLoading, isError, error, refetch } = useSuppliers();
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Поставщики"
        actions={
          canMutate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Добавить
            </Button>
          )
        }
      />

      {isLoading && <Skeleton className="h-64 w-full rounded-lg" />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState icon={Users} title="Поставщиков пока нет" />
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <DataList>
          {data.map((s) => (
            <Link key={s.id} href={`/suppliers/${s.id}`}>
              <DataListRow onClick={() => {}}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {s.name}
                    {!s.isActive && <span className="ml-2 text-xs text-muted-foreground">(архив)</span>}
                  </p>
                  {s.contactPerson && (
                    <p className="truncate text-xs text-muted-foreground">{s.contactPerson}</p>
                  )}
                </div>
                {s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}
              </DataListRow>
            </Link>
          ))}
        </DataList>
      )}

      <CreateSupplierDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateSupplierDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
              onSuccess: () => {
                toast.success("Поставщик добавлен");
                reset();
                onOpenChange(false);
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
