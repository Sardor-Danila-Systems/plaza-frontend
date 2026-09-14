"use client";

import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { useBlocks, useFloors, useCreateBlock, useCreateFloor } from "@/lib/query/hooks/use-construction";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";
import { getErrorMessage } from "@/lib/errors/map";

export default function ConstructionSettingsPage() {
  const { data: blocks, isLoading, isError, error, refetch } = useBlocks();
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);
  const [createBlockOpen, setCreateBlockOpen] = useState(false);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Объекты</h1>
        {canMutate && (
          <Button size="sm" onClick={() => setCreateBlockOpen(true)}>
            <Plus className="size-4" />
            Блок
          </Button>
        )}
      </div>

      {isLoading && <Skeleton className="h-64 w-full rounded-lg" />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && blocks && blocks.length === 0 && (
        <EmptyState icon={Building2} title="Блоков пока нет" />
      )}

      {!isLoading && !isError && blocks && blocks.length > 0 && (
        <div className="space-y-3">
          {blocks.map((block) => (
            <div key={block.id} className="rounded-lg border">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                onClick={() => setExpandedBlockId((cur) => (cur === block.id ? null : block.id))}
              >
                <span>
                  <span className="text-sm font-medium">{block.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{block.code}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {expandedBlockId === block.id ? "Скрыть этажи" : "Показать этажи"}
                </span>
              </button>
              {expandedBlockId === block.id && (
                <FloorsSection blockId={block.id} canMutate={canMutate} />
              )}
            </div>
          ))}
        </div>
      )}

      <CreateBlockDialog open={createBlockOpen} onOpenChange={setCreateBlockOpen} />
    </div>
  );
}

function FloorsSection({ blockId, canMutate }: { blockId: string; canMutate: boolean }) {
  const { data: floors, isLoading } = useFloors(blockId);
  const [createOpen, setCreateOpen] = useState(false);
  const createFloor = useCreateFloor();
  const [label, setLabel] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  return (
    <div className="border-t px-4 py-3">
      {isLoading ? (
        <Skeleton className="h-16 w-full rounded-md" />
      ) : floors && floors.length > 0 ? (
        <DataList className="border-none">
          {floors.map((f) => (
            <DataListRow key={f.id} className="px-0">
              <span className="text-sm">{f.label}</span>
            </DataListRow>
          ))}
        </DataList>
      ) : (
        <p className="text-sm text-muted-foreground">Этажей пока нет</p>
      )}

      {canMutate && (
        <>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            Добавить этаж
          </Button>
          <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen} title="Новый этаж">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!label.trim()) return;
                createFloor.mutate(
                  { blockId, body: { label: label.trim(), sortOrder: Number(sortOrder) || 0 } },
                  {
                    onSuccess: () => {
                      toast.success("Этаж добавлен");
                      setLabel("");
                      setSortOrder("0");
                      setCreateOpen(false);
                    },
                    onError: (err) => toast.error(getErrorMessage(err)),
                  },
                );
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="floor-label">Название</Label>
                <Input id="floor-label" className="h-11" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Этаж 3" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor-sort-order">Порядок сортировки</Label>
                <Input
                  id="floor-sort-order"
                  type="number"
                  className="h-11"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
              <Button type="submit" className="h-11 w-full" disabled={!label.trim() || createFloor.isPending}>
                {createFloor.isPending ? "Сохранение…" : "Добавить"}
              </Button>
            </form>
          </ResponsiveDialog>
        </>
      )}
    </div>
  );
}

function CreateBlockDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const createBlock = useCreateBlock();

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Новый блок">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !code.trim()) return;
          createBlock.mutate(
            { name: name.trim(), code: code.trim() },
            {
              onSuccess: () => {
                toast.success("Блок создан");
                setName("");
                setCode("");
                onOpenChange(false);
              },
              onError: (err) => toast.error(getErrorMessage(err)),
            },
          );
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="block-name">Название</Label>
          <Input id="block-name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} placeholder="Блок A" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="block-code">Код (латиницей)</Label>
          <Input id="block-code" className="h-11" value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} placeholder="block-a" />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={!name.trim() || !code.trim() || createBlock.isPending}>
          {createBlock.isPending ? "Сохранение…" : "Создать"}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
