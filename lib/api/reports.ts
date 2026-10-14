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

/** The three printable forms in the 1C layout the accountants know. All take
 * dateFrom/dateTo (default: 1 January to today) plus one form-specific
 * filter — see plaza-api/src/modules/reports/dto/form-report-queries.dto.ts. */
export type FormReportKey = "supplier-reconciliation" | "material-report" | "cash-journal";

export interface FormReportParams {
  dateFrom?: string;
  dateTo?: string;
  supplierId?: string;
  warehouseId?: string;
  account?: string;
}

export const reportsApi = {
  downloadForm: (
    projectId: string,
    reportKey: FormReportKey,
    params: FormReportParams = {},
  ): Promise<DownloadedFile> =>
    apiFetchBlob(`/projects/${projectId}/reports/${reportKey}.xlsx`, {
      query: params as Record<string, string | undefined>,
      fallbackFilename: `${reportKey}.xlsx`,
    }),

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
