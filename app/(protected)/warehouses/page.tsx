"use client";

import { useState } from "react";
import Link from "next/link";
import { Warehouse as WarehouseIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { useWarehouses, useCreateWarehouse } from "@/lib/query/hooks/use-inventory";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";
import { getErrorMessage } from "@/lib/errors/map";

export default function WarehousesPage() {
  const { data, isLoading, isError, error, refetch } = useWarehouses();
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Склады</h1>
        {canMutate && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Добавить
          </Button>
        )}
      </div>

      {isLoading && <Skeleton className="h-64 w-full rounded-lg" />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState icon={WarehouseIcon} title="Складов пока нет" />
      )}
      {!isLoading && !isError && data && data.length > 0 && (
        <DataList>
          {data.map((w) => (
            <Link key={w.id} href={`/warehouses/${w.id}`}>
              <DataListRow onClick={() => {}}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {w.name}
                    {!w.isActive && <span className="ml-2 text-xs text-muted-foreground">(архив)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{w.code}</p>
                </div>
              </DataListRow>
            </Link>
          ))}
        </DataList>
      )}

      <CreateWarehouseDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function CreateWarehouseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [comment, setComment] = useState("");
  const createMutation = useCreateWarehouse();

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
              onSuccess: () => {
                toast.success("Склад создан");
                setName("");
                setCode("");
                setComment("");
                onOpenChange(false);
              },
              onError: (err) => toast.error(getErrorMessage(err)),
            },
          );
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="wh-name">Название</Label>
          <Input id="wh-name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wh-code">Код (латиницей, например main)</Label>
          <Input
            id="wh-code"
            className="h-11"
            value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase())}
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
