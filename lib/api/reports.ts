import { apiFetchBlob, type DownloadedFile } from "@/lib/api/client";

export type ReportKey =
  | "cash"
  | "purchases"
  | "suppliers"
  | "debts"
  | "advances"
  | "inventory"
  | "movements"
  | "construction-usage";

/** cash/purchases/movements/construction-usage accept dateFrom/dateTo;
 * suppliers/debts/advances/inventory take no params at all — see
 * plaza-api/src/modules/reports/reports.controller.ts. */
export const REPORTS_WITH_PERIOD_FILTER: ReadonlySet<ReportKey> = new Set([
  "cash",
  "purchases",
  "movements",
  "construction-usage",
]);

export const reportsApi = {
  download: (
    projectId: string,
    reportKey: ReportKey,
    filters: { dateFrom?: string; dateTo?: string } = {},
  ): Promise<DownloadedFile> =>
    apiFetchBlob(`/projects/${projectId}/reports/${reportKey}.xlsx`, {
      query: REPORTS_WITH_PERIOD_FILTER.has(reportKey)
        ? (filters as Record<string, string | undefined>)
        : undefined,
      fallbackFilename: `${reportKey}.xlsx`,
    }),
};
