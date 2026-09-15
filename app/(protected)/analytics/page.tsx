"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { MoneyText } from "@/components/shared/money-text";
import { useAnalyticsSummary, useMaterialsAnalytics, useConstructionAnalytics } from "@/lib/query/hooks/use-analytics";
import { useMaterials } from "@/lib/query/hooks/use-inventory";
import { useBlocks, useFloors } from "@/lib/query/hooks/use-construction";
import { formatMoney, formatQuantity } from "@/lib/format/decimal";
import { todayBusinessDate, toExclusiveEndDate } from "@/lib/format/date";
import { BarChart3 } from "lucide-react";

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function CashCard({ title, cash, currency }: { title: string; cash: { opening: string; periodInflow: string; periodOutflow: string; closing: string; current: string }; currency: "UZS" | "USD" }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-semibold tabular-nums">
          <MoneyText value={cash.current} currency={currency} />
        </p>
        <p className="text-xs text-muted-foreground">Текущий остаток</p>
        <dl className="grid grid-cols-2 gap-y-1 pt-2 text-xs">
          <dt className="text-muted-foreground">На начало периода</dt>
          <dd className="text-right">{formatMoney(cash.opening, currency)}</dd>
          <dt className="text-muted-foreground">Приход за период</dt>
          <dd className="text-right text-success">{formatMoney(cash.periodInflow, currency)}</dd>
          <dt className="text-muted-foreground">Расход за период</dt>
          <dd className="text-right text-destructive">{formatMoney(cash.periodOutflow, currency)}</dd>
          <dt className="text-muted-foreground">На конец периода</dt>
          <dd className="text-right font-medium">{formatMoney(cash.closing, currency)}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(todayBusinessDate());
  // Picked dates are inclusive from the user's perspective; the backend's
  // dateTo is exclusive — see toExclusiveEndDate's doc comment.
  const filters = {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo ? toExclusiveEndDate(dateTo) : undefined,
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Аналитика</h1>

      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(firstOfMonth()); setDateTo(todayBusinessDate()); }}>
            Этот месяц
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(daysAgo(30)); setDateTo(todayBusinessDate()); }}>
            30 дней
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); }}>
            Весь период
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="analytics-date-from" className="text-xs">С даты</Label>
            <Input id="analytics-date-from" type="date" className="h-10" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="analytics-date-to" className="text-xs">По дату</Label>
            <Input id="analytics-date-to" type="date" className="h-10" max={todayBusinessDate()} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Сводка</TabsTrigger>
          <TabsTrigger value="materials">Материалы</TabsTrigger>
          <TabsTrigger value="construction">Объекты</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <SummaryTab filters={filters} />
        </TabsContent>
        <TabsContent value="materials" className="mt-4">
          <MaterialsTab filters={filters} />
        </TabsContent>
        <TabsContent value="construction" className="mt-4">
          <ConstructionTab filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryTab({ filters }: { filters: { dateFrom?: string; dateTo?: string } }) {
  const { data, isLoading, isError, error, refetch } = useAnalyticsSummary(filters);

  if (isLoading) return <Skeleton className="h-96 w-full rounded-lg" />;
  if (isError || !data) return <ErrorState error={error} onRetry={() => refetch()} />;

  const maxCategory = Math.max(1, ...data.expensesByCategory.map((c) => Number(c.amountUzs) || 0));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CashCard title="Касса, сум" cash={data.cashUzs} currency="UZS" />
        <CashCard title="Касса, USD" cash={data.cashUsd} currency="USD" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="space-y-1 pt-4">
            <p className="text-xs font-medium text-muted-foreground">Закупки</p>
            <p className="text-lg font-semibold tabular-nums">{formatMoney(data.purchasesTotalUzs, "UZS")}</p>
            <p className="text-xs text-muted-foreground">{data.purchasesCount} шт.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-4">
            <p className="text-xs font-medium text-muted-foreground">Зарплаты</p>
            <p className="text-lg font-semibold tabular-nums">{formatMoney(data.salariesUzs, "UZS")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-4">
            <p className="text-xs font-medium text-muted-foreground">Долг поставщикам</p>
            {data.supplierDebtAsOf.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет</p>
            ) : (
              data.supplierDebtAsOf.map((d) => (
                <p key={d.currency} className="text-sm font-medium tabular-nums">
                  <MoneyText value={d.amount} currency={d.currency} />
                </p>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-4">
            <p className="text-xs font-medium text-muted-foreground">Доступный аванс</p>
            {data.supplierAdvancesAvailableAsOf.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет</p>
            ) : (
              data.supplierAdvancesAvailableAsOf.map((d) => (
                <p key={d.currency} className="text-sm font-medium tabular-nums">
                  <MoneyText value={d.amount} currency={d.currency} />
                </p>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent className="flex items-center justify-between pt-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Стоимость склада сейчас</p>
              <p className="text-lg font-semibold tabular-nums">{formatMoney(data.currentInventoryValueUzs, "UZS")}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-muted-foreground">На конец периода</p>
              <p className="text-sm tabular-nums text-muted-foreground">{formatMoney(data.inventoryValueAsOfUzs, "UZS")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Расходы по категориям</h2>
        {data.expensesByCategory.length === 0 ? (
          <EmptyState icon={BarChart3} title="Расходов за период нет" />
        ) : (
          <div className="space-y-3 rounded-lg border bg-card p-4">
            {data.expensesByCategory.map((cat) => (
              <div key={cat.categoryId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{cat.categoryName}</span>
                  <span className="shrink-0 font-medium tabular-nums">{formatMoney(cat.amountUzs, "UZS")}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(2, (Number(cat.amountUzs) / maxCategory) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MaterialsTab({ filters }: { filters: { dateFrom?: string; dateTo?: string } }) {
  const [materialId, setMaterialId] = useState("ALL");
  const { data: materials = [] } = useMaterials({ isActive: true });
  const { data, isLoading, isError, error, refetch } = useMaterialsAnalytics({
    ...filters,
    materialId: materialId === "ALL" ? undefined : materialId,
  });

  return (
    <div className="space-y-3">
      <Select value={materialId} onValueChange={setMaterialId}>
        <SelectTrigger className="h-10 w-full">
          <SelectValue placeholder="Все материалы" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Все материалы</SelectItem>
          {materials.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading && <Skeleton className="h-48 w-full rounded-lg" />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && data && data.materials.length === 0 && (
        <EmptyState icon={BarChart3} title="Данных за период нет" />
      )}
      {!isLoading && !isError && data && data.materials.length > 0 && (
        <div className="divide-y overflow-hidden rounded-lg border bg-card">
          {data.materials.map((row) => (
            <div key={row.materialId} className="space-y-1 px-4 py-3">
              <p className="text-sm font-medium">{row.materialName}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Закуплено</p>
                  <p className="tabular-nums">{formatQuantity(row.purchasedQuantity)}</p>
                  <p className="tabular-nums text-muted-foreground">{formatMoney(row.purchasedValueUzs, "UZS")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Списано</p>
                  <p className="tabular-nums">{formatQuantity(row.consumedQuantity)}</p>
                  <p className="tabular-nums text-muted-foreground">{formatMoney(row.consumedValueUzs, "UZS")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConstructionTab({ filters }: { filters: { dateFrom?: string; dateTo?: string } }) {
  const [blockId, setBlockId] = useState("ALL");
  const { data: blocks = [] } = useBlocks();
  const { data: floors = [] } = useFloors(blockId === "ALL" ? null : blockId);
  const [floorId, setFloorId] = useState("ALL");
  const { data, isLoading, isError, error, refetch } = useConstructionAnalytics({
    ...filters,
    blockId: blockId === "ALL" ? undefined : blockId,
    floorId: floorId === "ALL" ? undefined : floorId,
  });

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { blockName: string; floorLabel: string; rows: typeof data.rows }>();
    for (const row of data.rows) {
      const key = `${row.blockId}:${row.floorId}`;
      if (!map.has(key)) map.set(key, { blockName: row.blockName, floorLabel: row.floorLabel, rows: [] });
      map.get(key)!.rows.push(row);
    }
    return Array.from(map.values());
  }, [data]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Select value={blockId} onValueChange={(v) => { setBlockId(v); setFloorId("ALL"); }}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Все блоки" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все блоки</SelectItem>
            {blocks.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={floorId} onValueChange={setFloorId} disabled={blockId === "ALL"}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue placeholder="Все этажи" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все этажи</SelectItem>
            {floors.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <Skeleton className="h-48 w-full rounded-lg" />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && grouped.length === 0 && (
        <EmptyState icon={BarChart3} title="Данных за период нет" />
      )}
      {!isLoading && !isError && grouped.length > 0 && (
        <div className="space-y-3">
          {grouped.map((group) => (
            <div key={`${group.blockName}:${group.floorLabel}`} className="overflow-hidden rounded-lg border bg-card">
              <p className="border-b bg-muted/40 px-4 py-2 text-sm font-medium">
                {group.blockName} / {group.floorLabel}
              </p>
              <div className="divide-y">
                {group.rows.map((row) => (
                  <div key={row.materialId} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="truncate">{row.materialName}</span>
                    <div className="text-right">
                      <p className="tabular-nums">{formatQuantity(row.quantity)}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">{formatMoney(row.valueUzs, "UZS")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
