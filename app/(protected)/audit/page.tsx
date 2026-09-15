"use client";

import { useState } from "react";
import { ScrollText, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataList, DataListRow } from "@/components/shared/data-list";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useAuditLog } from "@/lib/query/hooks/use-audit";
import { formatDateTime, toExclusiveEndDate } from "@/lib/format/date";
import { humanizeAction } from "@/lib/format/audit";

export default function AuditPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useAuditLog({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo ? toExclusiveEndDate(dateTo) : undefined,
    action: action.trim() || undefined,
    entityType: entityType.trim() || undefined,
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Аудит</h1>

      <div className="space-y-3 rounded-lg border p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="audit-date-from" className="text-xs">С даты</Label>
            <Input
              id="audit-date-from"
              type="date"
              className="h-10"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-date-to" className="text-xs">По дату</Label>
            <Input
              id="audit-date-to"
              type="date"
              className="h-10"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          {advancedOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          Фильтр по коду действия
        </button>
        {advancedOpen && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="audit-action" className="text-xs">Действие (точный код)</Label>
              <Input
                id="audit-action"
                className="h-10"
                placeholder="purchase.create"
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="audit-entity-type" className="text-xs">Тип сущности</Label>
              <Input
                id="audit-entity-type"
                className="h-10"
                placeholder="Purchase"
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Даты фильтруют по времени записи в журнале (UTC), а не по рабочей дате операции.
        </p>
      </div>

      {isLoading && <Skeleton className="h-64 w-full rounded-lg" />}
      {isError && <ErrorState error={error} onRetry={() => refetch()} />}
      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState icon={ScrollText} title="Записей не найдено" />
      )}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <>
          <DataList>
            {data.data.map((entry) => (
              <div key={entry.id}>
                <DataListRow onClick={() => setExpandedId((cur) => (cur === entry.id ? null : entry.id))}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {humanizeAction(entry.action, entry.entityType)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                  </div>
                  {expandedId === entry.id ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </DataListRow>
                {expandedId === entry.id && (
                  <div className="space-y-2 border-t bg-muted/30 px-4 py-3 text-xs">
                    <p className="text-muted-foreground">
                      ID записи: <span className="font-mono">{entry.entityId}</span>
                    </p>
                    {entry.previousData && (
                      <div>
                        <p className="mb-1 font-medium text-muted-foreground">До изменения</p>
                        <pre className="overflow-x-auto rounded bg-background p-2 font-mono">
                          {JSON.stringify(entry.previousData, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div>
                      <p className="mb-1 font-medium text-muted-foreground">После изменения</p>
                      <pre className="overflow-x-auto rounded bg-background p-2 font-mono">
                        {JSON.stringify(entry.newData, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </DataList>

          <div className="flex items-center justify-between text-sm">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Назад
            </Button>
            <span className="text-muted-foreground">
              Стр. {data.page} из {Math.max(1, Math.ceil(data.total / data.pageSize))}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page * data.pageSize >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Далее
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
