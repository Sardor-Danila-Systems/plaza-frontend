"use client";

import { useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronRight, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { PageHeader } from "@/components/shared/page-header";
import {
  useBlocks,
  useFloors,
  useCreateBlocksBulk,
  useCreateFloorsBulk,
} from "@/lib/query/hooks/use-construction";
import { useAuth } from "@/lib/auth/auth-provider";
import { canMutateProject } from "@/lib/auth/permissions";
import { getErrorMessage } from "@/lib/errors/map";
import { plural, slugify } from "@/lib/format/slug";

const MAX_BLOCKS = 50;
const MAX_FLOORS = 200;

/** Cyrillic block suffixes, skipping the letters that read ambiguously on
 * a site plan (Ё, Й, Ъ, Ы, Ь). Past the alphabet the numbering continues
 * with plain numbers rather than doubling letters up. */
const BLOCK_LETTERS = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ".split("");

function blockSuffix(index: number, mode: "letters" | "numbers"): string {
  if (mode === "numbers") return String(index + 1);
  return BLOCK_LETTERS[index] ?? String(index + 1);
}

function clampInt(value: string, min: number, max: number): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return min;
  return Math.min(Math.max(parsed, min), max);
}

export default function ConstructionSettingsPage() {
  const { data: blocks, isLoading, isError, error, refetch } = useBlocks();
  const { user } = useAuth();
  const canMutate = canMutateProject(user?.role);
  const [createBlocksOpen, setCreateBlocksOpen] = useState(false);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Объекты"
        subtitle={blocks?.length ? plural(blocks.length, "блок", "блока", "блоков") : undefined}
        actions={
          canMutate && (
            <Button size="sm" onClick={() => setCreateBlocksOpen(true)}>
              <Plus className="size-4" />
              Блоки
            </Button>
          )
        }
      />

      {isLoading && <Skeleton className="h-64 w-full rounded-lg" />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && blocks && blocks.length === 0 && (
        <EmptyState
          icon={Building2}
          title="Блоков пока нет"
          description="Создайте сразу все блоки объекта с нужным количеством этажей"
        />
      )}

      {!isLoading && !isError && blocks && blocks.length > 0 && (
        <div className="space-y-3">
          {blocks.map((block) => {
            const expanded = expandedBlockId === block.id;
            return (
              <div key={block.id} className="rounded-lg border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
                  aria-expanded={expanded}
                  onClick={() => setExpandedBlockId((cur) => (cur === block.id ? null : block.id))}
                >
                  <span className="min-w-0">
                    <span className="text-sm font-medium">{block.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{block.code}</span>
                    {!block.isActive && (
                      <span className="ml-2 text-xs text-muted-foreground">(архив)</span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    Этажи
                    {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </span>
                </button>
                {expanded && <FloorsSection blockId={block.id} canMutate={canMutate} />}
              </div>
            );
          })}
        </div>
      )}

      <CreateBlocksDialog open={createBlocksOpen} onOpenChange={setCreateBlocksOpen} />
    </div>
  );
}

function FloorsSection({ blockId, canMutate }: { blockId: string; canMutate: boolean }) {
  const { data: floors, isLoading } = useFloors(blockId);
  const [createOpen, setCreateOpen] = useState(false);

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
            Добавить этажи
          </Button>
          <AddFloorsDialog
            blockId={blockId}
            existingCount={floors?.length ?? 0}
            open={createOpen}
            onOpenChange={setCreateOpen}
          />
        </>
      )}
    </div>
  );
}

/**
 * The shape of a building ("4 blocks, 9 floors each") is known up front, so
 * this creates all of it in one call instead of one block and one floor per
 * dialog. Names, codes and floor labels are all generated from a prefix and
 * previewed before anything is sent.
 */
function CreateBlocksDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [prefix, setPrefix] = useState("Блок");
  const [blockCount, setBlockCount] = useState("1");
  const [numbering, setNumbering] = useState<"letters" | "numbers">("letters");
  const [floorCount, setFloorCount] = useState("0");
  const [floorPrefix, setFloorPrefix] = useState("Этаж");
  const createBlocks = useCreateBlocksBulk();

  const count = clampInt(blockCount, 1, MAX_BLOCKS);
  const floors = clampInt(floorCount, 0, MAX_FLOORS);

  const payload = useMemo(() => {
    const trimmedPrefix = prefix.trim();
    if (!trimmedPrefix) return [];
    const floorLabels = Array.from(
      { length: floors },
      (_, i) => `${floorPrefix.trim() || "Этаж"} ${i + 1}`,
    );
    return Array.from({ length: count }, (_, i) => {
      // A single block is named exactly what was typed — a suffix would
      // only ever turn "Основной корпус" into "Основной корпус А".
      const name = count === 1 ? trimmedPrefix : `${trimmedPrefix} ${blockSuffix(i, numbering)}`;
      return { name, code: slugify(name), floorLabels: floorLabels.length ? floorLabels : undefined };
    });
  }, [prefix, count, numbering, floors, floorPrefix]);

  // Transliteration can collide ("Блок А"/"Блок A" both slug to "blok-a"),
  // and the server rejects the whole payload for a repeated code — catching
  // it here explains which name to change instead.
  const duplicateCode = payload
    .map((b) => b.code)
    .find((code, i, all) => all.indexOf(code) !== i);
  const invalid = payload.length === 0 || payload.some((b) => !b.code) || !!duplicateCode;

  const reset = () => {
    setPrefix("Блок");
    setBlockCount("1");
    setNumbering("letters");
    setFloorCount("0");
    setFloorPrefix("Этаж");
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Новые блоки"
      description="Все блоки и их этажи создаются одной операцией"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (invalid) return;
          createBlocks.mutate(
            { blocks: payload },
            {
              onSuccess: (result) => {
                toast.success(
                  result.floorsCreated > 0
                    ? `Создано блоков: ${result.blocks.length}, этажей: ${result.floorsCreated}`
                    : `Создано блоков: ${result.blocks.length}`,
                );
                reset();
                onOpenChange(false);
              },
              onError: (err) => toast.error(getErrorMessage(err)),
            },
          );
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="blocks-prefix">Название</Label>
            <Input
              id="blocks-prefix"
              className="h-11"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="Блок"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blocks-count">Количество блоков</Label>
            <Input
              id="blocks-count"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_BLOCKS}
              className="h-11"
              value={blockCount}
              onChange={(e) => setBlockCount(e.target.value)}
            />
          </div>
        </div>

        {count > 1 && (
          <div className="space-y-2">
            <Label id="blocks-numbering-label">Нумерация блоков</Label>
            <Select value={numbering} onValueChange={(v) => setNumbering(v as "letters" | "numbers")}>
              <SelectTrigger className="h-11 w-full" aria-labelledby="blocks-numbering-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="letters">Буквы (А, Б, В…)</SelectItem>
                <SelectItem value="numbers">Цифры (1, 2, 3…)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="blocks-floor-count">Этажей в каждом</Label>
            <Input
              id="blocks-floor-count"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_FLOORS}
              className="h-11"
              value={floorCount}
              onChange={(e) => setFloorCount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blocks-floor-prefix">Название этажа</Label>
            <Input
              id="blocks-floor-prefix"
              className="h-11"
              value={floorPrefix}
              onChange={(e) => setFloorPrefix(e.target.value)}
              placeholder="Этаж"
              disabled={floors === 0}
            />
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Layers className="size-3.5" />
            Будет создано
          </p>
          {payload.length === 0 ? (
            <p className="text-muted-foreground">Укажите название блока</p>
          ) : (
            <>
              <p className="break-words">{payload.map((b) => b.name).join(", ")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {floors > 0
                  ? `по ${plural(floors, "этажу", "этажа", "этажей")} в каждом блоке`
                  : "без этажей — их можно добавить позже"}
              </p>
              {duplicateCode && (
                <p className="mt-1 text-xs text-destructive">
                  Коды блоков повторяются ({duplicateCode}) — измените названия
                </p>
              )}
            </>
          )}
        </div>

        <Button type="submit" className="h-11 w-full" disabled={invalid || createBlocks.isPending}>
          {createBlocks.isPending ? "Сохранение…" : "Создать"}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}

function AddFloorsDialog({
  blockId,
  existingCount,
  open,
  onOpenChange,
}: {
  blockId: string;
  existingCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [count, setCount] = useState("1");
  const [floorPrefix, setFloorPrefix] = useState("Этаж");
  const createFloors = useCreateFloorsBulk();

  const floors = clampInt(count, 1, MAX_FLOORS);
  // Continue the block's own numbering rather than restarting at 1, which
  // would collide with the labels already there.
  const labels = Array.from(
    { length: floors },
    (_, i) => `${floorPrefix.trim() || "Этаж"} ${existingCount + i + 1}`,
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Добавить этажи">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          createFloors.mutate(
            { blockId, body: { labels } },
            {
              onSuccess: (created) => {
                toast.success(`Добавлено ${plural(created.length, "этаж", "этажа", "этажей")}`);
                setCount("1");
                onOpenChange(false);
              },
              onError: (err) => toast.error(getErrorMessage(err)),
            },
          );
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="floors-count">Количество</Label>
            <Input
              id="floors-count"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_FLOORS}
              className="h-11"
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="floors-prefix">Название</Label>
            <Input
              id="floors-prefix"
              className="h-11"
              value={floorPrefix}
              onChange={(e) => setFloorPrefix(e.target.value)}
              placeholder="Этаж"
            />
          </div>
        </div>

        <p className="rounded-lg bg-muted/50 p-3 text-sm break-words">
          {labels.join(", ")}
        </p>

        <Button type="submit" className="h-11 w-full" disabled={createFloors.isPending}>
          {createFloors.isPending ? "Сохранение…" : "Добавить"}
        </Button>
      </form>
    </ResponsiveDialog>
  );
}
