"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { CombinedCashCard } from "@/components/shared/combined-cash-card";
import { useAnalyticsSummary, useMaterialsAnalytics, useConstructionAnalytics } from "@/lib/query/hooks/use-analytics";
import { useMaterials } from "@/lib/query/hooks/use-inventory";
import { useBlocks, useFloors } from "@/lib/query/hooks/use-construction";
import { useCombinedCash } from "@/lib/query/hooks/use-combined-cash";
import { formatMoney, formatMoneyAbbrev, formatQuantity } from "@/lib/format/decimal";
import { todayBusinessDate, toExclusiveEndDate } from "@/lib/format/date";
import { BarChart3 } from "lucide-react";
import Decimal from "decimal.js";

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** KPI chip — deliberately smaller/denser than the hero cash card so the
 * page has real visual hierarchy instead of N equal-weight boxes. */
function KpiChip({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo, setDateTo] = useState(todayBusinessDate());
  // Picked dates are inclusive from the user's perspective; the backend's
  // dateTo is exclusive — see toExclusiveEndDate's doc comment. Unchanged
  // from the previous version of this page — already correct.
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

const flowChartConfig = {
  value: { label: "Сумма" },
} satisfies ChartConfig;

function SummaryTab({ filters }: { filters: { dateFrom?: string; dateTo?: string } }) {
  const { data, isLoading, isError, error, refetch } = useAnalyticsSummary(filters);
  const combinedCash = useCombinedCash();

  if (isLoading) return <Skeleton className="h-96 w-full rounded-lg" />;
  if (isError || !data) return <ErrorState error={error} onRetry={() => refetch()} />;

  const flowData = [
    { name: "Приход", value: Number(data.cashUzs.periodInflow), fill: "var(--color-success)" },
    { name: "Расход", value: Number(data.cashUzs.periodOutflow), fill: "var(--color-destructive)" },
  ];
  const hasFlowData = flowData.some((d) => d.value > 0);
  const net = new Decimal(data.cashUzs.periodInflow).minus(data.cashUzs.periodOutflow);

  const totalExpenses = data.expensesByCategory.reduce((sum, c) => sum + (Number(c.amountUzs) || 0), 0);
  const categoryData = data.expensesByCategory
    .map((c) => ({ name: c.categoryName, value: Number(c.amountUzs) || 0 }))
    .sort((a, b) => b.value - a.value);

  const usdAsUzs = combinedCash.rate ? new Decimal(combinedCash.usdCash).times(combinedCash.rate) : null;
  const compositionDataRaw = usdAsUzs
    ? [
        { name: "UZS", value: Number(combinedCash.uzsCash), fill: "var(--color-primary)" },
        { name: "USD → UZS", value: usdAsUzs.toNumber(), fill: "var(--color-warning)" },
      ]
    : null;
  const compositionData =
    compositionDataRaw && compositionDataRaw.some((d) => d.value > 0) ? compositionDataRaw : null;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <CombinedCashCard />

      {/* Secondary KPI strip — deliberately smaller than the hero above */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiChip label="Закупки" value={formatMoney(data.purchasesTotalUzs, "UZS")} sub={`${data.purchasesCount} шт.`} />
        <KpiChip label="Зарплаты" value={formatMoney(data.salariesUzs, "UZS")} />
        <KpiChip
          label="Долг поставщикам"
          value={data.supplierDebtAsOf.length ? data.supplierDebtAsOf.map((d) => formatMoney(d.amount, d.currency)).join(" · ") : "Нет"}
        />
        <KpiChip
          label="Доступный аванс"
          value={data.supplierAdvancesAvailableAsOf.length ? data.supplierAdvancesAvailableAsOf.map((d) => formatMoney(d.amount, d.currency)).join(" · ") : "Нет"}
        />
        <KpiChip label="Склад сейчас" value={formatMoney(data.currentInventoryValueUzs, "UZS")} />
        <KpiChip label="Склад на конец периода" value={formatMoney(data.inventoryValueAsOfUzs, "UZS")} />
      </div>

      {/* Income vs Expenses */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Приход и расход за период</CardTitle>
        </CardHeader>
        <CardContent>
          {hasFlowData ? (
            <>
              <ChartContainer config={flowChartConfig} className="aspect-auto h-40 w-full">
                <BarChart data={flowData} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatMoneyAbbrev(v, "UZS")} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(value) => formatMoney(String(value), "UZS")} />}
                  />
                  <Bar dataKey="value" radius={4}>
                    {flowData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
              <p className={`mt-2 text-right text-sm font-medium ${net.isNegative() ? "text-destructive" : "text-success"}`}>
                Итого: {net.isNegative() ? "−" : "+"}{formatMoney(net.abs().toString(), "UZS")}
              </p>
            </>
          ) : (
            <EmptyState icon={BarChart3} title="Операций за период нет" />
          )}
        </CardContent>
      </Card>

      {/* Cash composition */}
      {compositionData && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Состав общей кассы</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={flowChartConfig} className="aspect-auto h-32 w-full">
              <BarChart data={compositionData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => formatMoneyAbbrev(v, "UZS")} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value) => formatMoney(String(value), "UZS")} />}
                />
                <Bar dataKey="value" radius={4}>
                  {compositionData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            <p className="mt-1 text-xs text-muted-foreground">
              USD переведён в сум по курсу: 1 USD = {formatMoney(combinedCash.rate, "UZS")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Expenses by category */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Расходы по категориям</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length === 0 ? (
            <EmptyState icon={BarChart3} title="Расходов за период нет" />
          ) : (
            <ChartContainer
              config={flowChartConfig}
              className="aspect-auto w-full"
              style={{ height: Math.max(120, categoryData.length * 36) }}
            >
              <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => formatMoneyAbbrev(v, "UZS")} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => {
                        const pct = totalExpenses > 0 ? ((Number(value) / totalExpenses) * 100).toFixed(1) : "0";
                        return `${formatMoney(String(value), "UZS")} (${pct}%)`;
                      }}
                    />
                  }
                />
                <Bar dataKey="value" fill="var(--color-primary)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
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

  const topByCost = useMemo(() => {
    if (!data) return [];
    return [...data.materials]
      .map((m) => ({ name: m.materialName, value: Number(m.purchasedValueUzs) || 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data]);

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
        <>
          {materialId === "ALL" && topByCost.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Самые затратные материалы</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={flowChartConfig}
                  className="aspect-auto w-full"
                  style={{ height: Math.max(120, topByCost.length * 32) }}
                >
                  <BarChart data={topByCost} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatMoneyAbbrev(v, "UZS")} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatMoney(String(value), "UZS")} />} />
                    <Bar dataKey="value" fill="var(--color-primary)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
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
        </>
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

  const byBlock = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { blockId: string; blockName: string; value: number }>();
    for (const row of data.rows) {
      const entry = map.get(row.blockId) ?? { blockId: row.blockId, blockName: row.blockName, value: 0 };
      entry.value += Number(row.valueUzs) || 0;
      map.set(row.blockId, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [data]);

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
        <>
          {blockId === "ALL" && byBlock.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Расход материалов по блокам (нажмите, чтобы отфильтровать)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={flowChartConfig}
                  className="aspect-auto w-full"
                  style={{ height: Math.max(120, byBlock.length * 36) }}
                >
                  <BarChart data={byBlock} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatMoneyAbbrev(v, "UZS")} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="blockName" tick={{ fontSize: 12 }} width={90} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatMoney(String(value), "UZS")} />} />
                    <Bar
                      dataKey="value"
                      fill="var(--color-primary)"
                      radius={4}
                      onClick={(entry) => setBlockId((entry as unknown as { blockId: string }).blockId)}
                      className="cursor-pointer"
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
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
        </>
      )}
    </div>
  );
}
