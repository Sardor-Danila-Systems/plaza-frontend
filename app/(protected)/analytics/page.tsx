"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
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
import { PageHeader } from "@/components/shared/page-header";
import { Stat, StatRow } from "@/components/shared/stat-row";
import {
  useAnalyticsSummary,
  useMaterialsAnalytics,
  useConstructionAnalytics,
} from "@/lib/query/hooks/use-analytics";
import { useMaterials, useInventoryBalances } from "@/lib/query/hooks/use-inventory";
import { useBlocks, useFloors } from "@/lib/query/hooks/use-construction";
import { usePurchases } from "@/lib/query/hooks/use-purchases";
import { useCombinedCash } from "@/lib/query/hooks/use-combined-cash";
import { formatMoney, formatMoneyAbbrev, formatQuantity } from "@/lib/format/decimal";
import { todayBusinessDate, toExclusiveEndDate } from "@/lib/format/date";
import { useProject } from "@/lib/project/project-context";
import { BarChart3, AlertTriangle, TrendingUp, TrendingDown, Users2 } from "lucide-react";
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

/** Previous period of the same length immediately preceding [from, to) —
 * used only for a real period-over-period comparison, never a fabricated
 * trend. Returns null when either bound is open ("весь период" has no
 * well-defined "previous" window). */
function previousPeriod(from: string, to: string): { dateFrom: string; dateTo: string } | null {
  if (!from || !to) return null;
  const fromD = new Date(`${from}T00:00:00.000Z`);
  const toD = new Date(`${to}T00:00:00.000Z`);
  const lengthMs = toD.getTime() - fromD.getTime();
  if (lengthMs <= 0) return null;
  const prevTo = new Date(fromD.getTime());
  const prevFrom = new Date(fromD.getTime() - lengthMs);
  return { dateFrom: prevFrom.toISOString().slice(0, 10), dateTo: prevTo.toISOString().slice(0, 10) };
}

/** Small KPI chip — deliberately smaller/denser than the hero cash card
 * so the page has real visual hierarchy instead of N equal-weight boxes. */
function KpiChip({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function InsightChip({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative" | "warning";
}) {
  const toneClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-destructive"
        : tone === "warning"
          ? "text-warning-foreground"
          : "text-foreground";
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5">
      <Icon className={`size-4 shrink-0 ${toneClass}`} />
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-semibold tabular-nums ${toneClass}`}>{value}</p>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { project } = useProject();
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
    <div className="space-y-5">
      <PageHeader title="Аналитика" subtitle={project?.name ?? undefined} />

      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(firstOfMonth()); setDateTo(todayBusinessDate()); }}>
            Этот месяц
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(daysAgo(30)); setDateTo(todayBusinessDate()); }}>
            30 дней
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(daysAgo(90)); setDateTo(todayBusinessDate()); }}>
            90 дней
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(daysAgo(182)); setDateTo(todayBusinessDate()); }}>
            6 месяцев
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setDateFrom(daysAgo(365)); setDateTo(todayBusinessDate()); }}>
            12 месяцев
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
          <SummaryTab filters={filters} dateFrom={dateFrom} dateTo={dateTo} />
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

const DONUT_COLORS = [
  "var(--color-primary)",
  "var(--color-gold)",
  "var(--color-success)",
  "var(--color-destructive)",
  "var(--color-warning)",
  "var(--color-chart-4)",
];

function SummaryTab({
  filters,
  dateFrom,
  dateTo,
}: {
  filters: { dateFrom?: string; dateTo?: string };
  dateFrom: string;
  dateTo: string;
}) {
  const { data, isLoading, isError, error, refetch } = useAnalyticsSummary(filters);
  const combinedCash = useCombinedCash();
  const { data: lowStock } = useInventoryBalances({ lowStock: true });

  const prevRange = previousPeriod(dateFrom, dateTo);
  const { data: prevData } = useAnalyticsSummary(
    { dateFrom: prevRange?.dateFrom, dateTo: prevRange?.dateTo },
    { enabled: !!prevRange },
  );
  const hasPrev = !!prevRange && !!prevData;

  const { data: purchasesInPeriod } = usePurchases({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    // Backend caps pageSize at 100 (ListPurchasesFilters) — a higher value
    // fails validation with a 400 on every analytics load. The supplier-
    // spending chart below is a best-effort aggregate of the most recent
    // purchases in the period, not a guaranteed-complete one.
    pageSize: 100,
  });

  const supplierSpending = useMemo(() => {
    if (!purchasesInPeriod) return [];
    const map = new Map<string, number>();
    for (const p of purchasesInPeriod.data) {
      if (p.status === "CANCELLED") continue;
      map.set(p.supplierNameSnapshot, (map.get(p.supplierNameSnapshot) ?? 0) + Number(p.totalAmountUzs));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [purchasesInPeriod]);

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
    .sort((a, b) => b.value - a.value)
    .filter((c) => c.value > 0);

  const usdAsUzs = combinedCash.rate ? new Decimal(combinedCash.usdCash).times(combinedCash.rate) : null;
  const compositionDataRaw = usdAsUzs
    ? [
        { name: "UZS", value: Number(combinedCash.uzsCash), fill: "var(--color-primary)" },
        { name: "USD → UZS", value: usdAsUzs.toNumber(), fill: "var(--color-gold)" },
      ]
    : null;
  const compositionData =
    compositionDataRaw && compositionDataRaw.some((d) => d.value > 0) ? compositionDataRaw : null;

  const expenseGrowthPct =
    hasPrev && Number(prevData.cashUzs.periodOutflow) > 0
      ? ((Number(data.cashUzs.periodOutflow) - Number(prevData.cashUzs.periodOutflow)) /
          Number(prevData.cashUzs.periodOutflow)) *
        100
      : null;
  const purchaseGrowthPct =
    hasPrev && Number(prevData.purchasesTotalUzs) > 0
      ? ((Number(data.purchasesTotalUzs) - Number(prevData.purchasesTotalUzs)) / Number(prevData.purchasesTotalUzs)) *
        100
      : null;

  const suppliersWithDebtCount = data.supplierDebtAsOf.length;

  return (
    <div className="space-y-5">
      {/* Core KPIs — spec §20 */}
      <StatRow>
        <Stat
          label="Касса"
          value={
            combinedCash.rate || combinedCash.totalUzs
              ? formatMoney(combinedCash.totalUzs, "UZS")
              : formatMoney(data.cashUzs.current, "UZS")
          }
        />
        <Stat label="Приход" tone="positive" value={`+${formatMoney(data.cashUzs.periodInflow, "UZS")}`} />
        <Stat label="Расход" tone="negative" value={`−${formatMoney(data.cashUzs.periodOutflow, "UZS")}`} />
        <Stat label="Остаток на складах" value={formatMoney(data.currentInventoryValueUzs, "UZS")} />
      </StatRow>

      {/* Attention / insights — spec §29, real data only */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          Что требует внимания
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <InsightChip
            icon={AlertTriangle}
            label="Низкие остатки"
            value={`${lowStock?.length ?? 0} материалов`}
            tone={(lowStock?.length ?? 0) > 0 ? "warning" : "default"}
          />
          <InsightChip
            icon={expenseGrowthPct !== null && expenseGrowthPct < 0 ? TrendingDown : TrendingUp}
            label="Рост расходов"
            value={expenseGrowthPct !== null ? `${expenseGrowthPct >= 0 ? "+" : ""}${expenseGrowthPct.toFixed(0)}%` : "—"}
            tone={expenseGrowthPct === null ? "default" : expenseGrowthPct > 0 ? "negative" : "positive"}
          />
          <InsightChip
            icon={Users2}
            label="Долг поставщикам"
            value={suppliersWithDebtCount ? `${suppliersWithDebtCount} валют` : "Нет"}
            tone={suppliersWithDebtCount ? "warning" : "default"}
          />
          <InsightChip
            icon={purchaseGrowthPct !== null && purchaseGrowthPct < 0 ? TrendingDown : TrendingUp}
            label="Рост закупок"
            value={purchaseGrowthPct !== null ? `${purchaseGrowthPct >= 0 ? "+" : ""}${purchaseGrowthPct.toFixed(0)}%` : "—"}
            tone="default"
          />
        </div>
        {!prevRange && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Сравнение с предыдущим периодом недоступно для «Весь период»
          </p>
        )}
      </div>

      {/* Secondary KPI strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiChip label="Закупки" value={formatMoney(data.purchasesTotalUzs, "UZS")} sub={`${data.purchasesCount} шт.`} />
        <KpiChip label="Зарплаты" value={formatMoney(data.salariesUzs, "UZS")} />
        <KpiChip
          label="Доступный аванс"
          value={data.supplierAdvancesAvailableAsOf.length ? data.supplierAdvancesAvailableAsOf.map((d) => formatMoney(d.amount, d.currency)).join(" · ") : "Нет"}
        />
        <KpiChip label="Склад на конец периода" value={formatMoney(data.inventoryValueAsOfUzs, "UZS")} />
      </div>

      {/* Income vs Expenses — main chart, full width */}
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

      {/* Expense breakdown + cash composition side by side on desktop */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Расходы по категориям</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <EmptyState icon={BarChart3} title="Расходов за период нет" />
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="relative shrink-0">
                  <ChartContainer config={flowChartConfig} className="aspect-square h-40 w-40">
                    <PieChart>
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
                      <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} strokeWidth={2}>
                        {categoryData.map((entry, i) => (
                          <Cell key={entry.name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-base font-semibold tabular-nums">{formatMoneyAbbrev(totalExpenses, "UZS")}</p>
                    <p className="text-xs text-muted-foreground">расход</p>
                  </div>
                </div>
                <div className="w-full min-w-0 flex-1 space-y-1.5">
                  {categoryData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2 text-sm">
                      <span
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                      />
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {totalExpenses > 0 ? ((c.value / totalExpenses) * 100).toFixed(0) : 0}%
                      </span>
                      <span className="shrink-0 text-right text-xs font-medium tabular-nums">
                        {formatMoneyAbbrev(c.value, "UZS")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {compositionData ? (
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
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Состав общей кассы</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState icon={BarChart3} title="Нет данных для расчёта" description="Задайте курс USD/UZS в кассе" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cash flow waterfall — real single-period figures (opening → in/out → closing); the backend has no daily/weekly bucketed history to plot a true trend line, so this deliberately stays a real snapshot instead of a fabricated one. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Движение денежных средств</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Начальный остаток</p>
              <p className="text-sm font-semibold tabular-nums">{formatMoney(data.cashUzs.opening, "UZS")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Приход</p>
              <p className="text-sm font-semibold tabular-nums text-success">
                +{formatMoney(data.cashUzs.periodInflow, "UZS")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Расход</p>
              <p className="text-sm font-semibold tabular-nums text-destructive">
                −{formatMoney(data.cashUzs.periodOutflow, "UZS")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Конечный остаток</p>
              <p className="text-sm font-semibold tabular-nums">{formatMoney(data.cashUzs.closing, "UZS")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplier spending — aggregated client-side from real purchase records in the selected period (not a backend endpoint yet). */}
      {supplierSpending.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Расходы по поставщикам</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={flowChartConfig}
              className="aspect-auto w-full"
              style={{ height: Math.max(120, supplierSpending.length * 34) }}
            >
              <BarChart data={supplierSpending} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => formatMoneyAbbrev(v, "UZS")} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatMoney(String(value), "UZS")} />} />
                <Bar dataKey="value" fill="var(--color-gold)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Топ материалов по расходам</CardTitle>
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
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
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
              <div key={`${group.blockName}:${group.floorLabel}`} className="overflow-hidden rounded-lg border border-border bg-card">
                <p className="border-b border-border bg-muted/40 px-4 py-2 text-sm font-medium">
                  {group.blockName} / {group.floorLabel}
                </p>
                <div className="divide-y divide-border">
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
