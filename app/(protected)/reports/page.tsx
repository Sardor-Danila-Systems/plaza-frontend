"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reportsApi, REPORTS_WITH_PERIOD_FILTER, type FormReportKey, type ReportKey } from "@/lib/api/reports";
import { useSuppliers } from "@/lib/query/hooks/use-suppliers";
import { useWarehouses } from "@/lib/query/hooks/use-inventory";
import { CASH_ACCOUNTS, CASH_ACCOUNT_LABELS } from "@/lib/api/types";
import { saveBlob } from "@/lib/download";
import { getErrorMessage } from "@/lib/errors/map";
import { useProject } from "@/lib/project/project-context";
import { toExclusiveEndDate } from "@/lib/format/date";

const REPORTS: { key: ReportKey; label: string; description: string }[] = [
  { key: "cash", label: "Касса", description: "Все операции по кассе за период" },
  { key: "purchases", label: "Закупки", description: "Закупки и позиции материалов за период" },
  { key: "suppliers", label: "Поставщики", description: "Список поставщиков с долгом и авансом" },
  { key: "debts", label: "Долги поставщикам", description: "Непогашенные долги" },
  { key: "advances", label: "Авансы поставщикам", description: "Выданные авансы" },
  { key: "inventory", label: "Склад", description: "Текущие остатки по материалам" },
  { key: "movements", label: "Движения материалов", description: "Все движения материалов на складах за период" },
  { key: "construction-usage", label: "Расход по объектам", description: "Расход материалов по блокам/этажам" },
];

export default function ReportsPage() {
  const { projectId } = useProject();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [downloadingKey, setDownloadingKey] = useState<ReportKey | FormReportKey | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("ALL");
  const [account, setAccount] = useState("ALL");
  const { data: suppliers = [] } = useSuppliers();
  const { data: warehouses = [] } = useWarehouses();

  const handleDownload = async (key: ReportKey) => {
    setDownloadingKey(key);
    try {
      const file = await reportsApi.download(projectId!, key, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo ? toExclusiveEndDate(dateTo) : undefined,
      });
      saveBlob(file.blob, file.filename);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloadingKey(null);
    }
  };

  const period = {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo ? toExclusiveEndDate(dateTo) : undefined,
  };

  const handleFormDownload = async (key: FormReportKey) => {
    if (key === "supplier-reconciliation" && !supplierId) {
      toast.error("Выберите поставщика для акта сверки");
      return;
    }
    setDownloadingKey(key);
    try {
      const file = await reportsApi.downloadForm(projectId!, key, {
        ...period,
        ...(key === "supplier-reconciliation" ? { supplierId } : {}),
        ...(key === "material-report" && warehouseId !== "ALL" ? { warehouseId } : {}),
        ...(key === "cash-journal" && account !== "ALL" ? { account } : {}),
      });
      saveBlob(file.blob, file.filename);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloadingKey(null);
    }
  };

  const FORM_REPORTS: { key: FormReportKey; label: string; description: string; filter: React.ReactNode }[] = [
    {
      key: "supplier-reconciliation",
      label: "Акт сверки",
      description: "Взаиморасчёты с поставщиком: сальдо, документы, обороты (в сумах)",
      filter: (
        <Select value={supplierId} onValueChange={(v) => v && setSupplierId(v)}>
          <SelectTrigger className="h-9 w-full" aria-label="Поставщик">
            <SelectValue placeholder="Выберите поставщика" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "material-report",
      label: "Материальный отчёт",
      description: "Сальдо на начало, приход, расход и сальдо на конец по материалам",
      filter: (
        <Select value={warehouseId} onValueChange={(v) => v && setWarehouseId(v)}>
          <SelectTrigger className="h-9 w-full" aria-label="Склад">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все склады</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "cash-journal",
      label: "Общий кассовый журнал",
      description: "Приходные и расходные ордера с остатком, отдельно сумы и доллары",
      filter: (
        <Select value={account} onValueChange={(v) => v && setAccount(v)}>
          <SelectTrigger className="h-9 w-full" aria-label="Касса">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все кассы</SelectItem>
            {CASH_ACCOUNTS.map((acc) => (
              <SelectItem key={acc} value={acc}>
                {CASH_ACCOUNT_LABELS[acc]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Отчёты" />

      <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
        <div className="space-y-1.5">
          <Label htmlFor="report-date-from" className="text-xs">С даты</Label>
          <Input id="report-date-from" type="date" className="h-10" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="report-date-to" className="text-xs">По дату</Label>
          <Input id="report-date-to" type="date" className="h-10" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <p className="col-span-2 text-xs text-muted-foreground">
          Период применяется к отчётам «Касса», «Закупки», «Движения материалов», «Расход по объектам» и ко всем
          формам 1С. Без дат формы строятся с 1 января по сегодня.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">Формы как в 1С</p>
        <div className="divide-y overflow-hidden rounded-lg border bg-card">
          {FORM_REPORTS.map((report) => (
            <div key={report.key} className="space-y-2 px-4 py-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{report.label}</p>
                  <p className="text-xs text-muted-foreground">{report.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={downloadingKey === report.key}
                  onClick={() => handleFormDownload(report.key)}
                >
                  <Download className="size-3.5" />
                  {downloadingKey === report.key ? "…" : "Скачать"}
                </Button>
              </div>
              {report.filter}
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">Выгрузки таблиц</p>

      <div className="divide-y overflow-hidden rounded-lg border bg-card">
        {REPORTS.map((report) => (
          <div key={report.key} className="flex items-center gap-3 px-4 py-3">
            <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{report.label}</p>
              <p className="text-xs text-muted-foreground">
                {report.description}
                {REPORTS_WITH_PERIOD_FILTER.has(report.key) && !dateFrom && !dateTo ? " (весь период)" : ""}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={downloadingKey === report.key}
              onClick={() => handleDownload(report.key)}
            >
              <Download className="size-3.5" />
              {downloadingKey === report.key ? "…" : "Скачать"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
