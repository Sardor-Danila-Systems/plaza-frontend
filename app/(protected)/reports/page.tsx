"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { reportsApi, REPORTS_WITH_PERIOD_FILTER, type ReportKey } from "@/lib/api/reports";
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
  { key: "movements", label: "Движения материалов", description: "Списания и перемещения за период" },
  { key: "construction-usage", label: "Расход по объектам", description: "Расход материалов по блокам/этажам" },
];

export default function ReportsPage() {
  const { projectId } = useProject();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [downloadingKey, setDownloadingKey] = useState<ReportKey | null>(null);

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
          Период применяется только к отчётам «Касса», «Закупки», «Движения материалов» и «Расход по объектам».
        </p>
      </div>

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
