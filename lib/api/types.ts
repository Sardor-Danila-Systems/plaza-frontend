// Shared enums and shapes mirrored from plaza-api's DTOs
// (plaza-api/src/generated/prisma/client.ts + src/modules/**/dto/*.ts).
// Money/quantity/rate fields are decimal strings end to end — never parsed
// into JS `number` for accounting arithmetic. See lib/format/decimal.ts.

export type Role = "OWNER" | "ACCOUNTANT" | "PROJECT_MANAGER";

export type Currency = "UZS" | "USD";

export type RateSource = "MANUAL" | "PROVIDER";

export type TransactionDirection = "IN" | "OUT";

export type FinancialTransactionType =
  | "INCOME"
  | "EXPENSE"
  | "SALARY"
  | "PURCHASE"
  | "ADVANCE"
  | "DEBT_PAYMENT"
  | "REFUND"
  | "ADJUSTMENT";

/** Only these three are postable directly through the finance create endpoint. */
export const CREATABLE_TRANSACTION_TYPES = [
  "INCOME",
  "EXPENSE",
  "SALARY",
] as const;
export type CreatableTransactionType =
  (typeof CREATABLE_TRANSACTION_TYPES)[number];

export type TransactionCategoryKind = "INCOME" | "EXPENSE" | "SALARY";

export type SettlementEffect =
  | "DEBT_SETTLED"
  | "ADVANCE_CONSUMED"
  | "OVERPAYMENT";

export type PurchaseStatus =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED";

/**
 * NOTE: the field is `data`, not `items` — docs/frontend-integration.md
 * documents `items`, but the live backend (verified directly against all
 * three paginated endpoints: finances, purchases, write-offs)
 * actually returns `data`. Trusting the running server over the doc here.
 */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SafeUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  projectId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: SafeUser;
}

export interface ManagerSummary {
  id: string;
  displayName: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  timezone: string;
  isActive: boolean;
  manager: ManagerSummary | null;
  createdAt: string;
}

export interface BuildingBlock {
  id: string;
  projectId: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
}

export interface Floor {
  id: string;
  projectId: string;
  blockId: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface Balance {
  uzs: string;
  usd: string;
}

export interface TransactionCategory {
  id: string;
  projectId: string;
  name: string;
  kind: TransactionCategoryKind;
  isActive: boolean;
  createdAt: string;
}

export interface CurrencyRate {
  id: string;
  projectId: string;
  currency: Currency;
  rateUzs: string;
  effectiveOn: string;
  source: RateSource;
  createdById: string;
  createdAt: string;
}

/** Read-only live USD/UZS quote from the Central Bank of Uzbekistan — not a
 * persisted CurrencyRate row until the user explicitly saves one. */
export interface LiveCurrencyRate {
  rateUzs: string;
  asOf: string;
  source: "PROVIDER";
  stale: boolean;
}

export interface FinancialTransaction {
  id: string;
  projectId: string;
  operationId: string;
  type: FinancialTransactionType;
  direction: TransactionDirection;
  amount: string;
  currency: Currency;
  exchangeRate: string;
  amountUzs: string;
  rateSource: RateSource;
  rateId: string | null;
  rateOverrideReason: string | null;
  categoryId: string | null;
  categoryNameSnapshot: string | null;
  recipient: string | null;
  comment: string | null;
  occurredAt: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
  cancelledById: string | null;
  reversalOfId: string | null;
}

export interface Supplier {
  id: string;
  projectId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  /** ИНН/СТИР — nine digits, or null. A string, not a number: leading
   * zeros are significant. */
  taxId: string | null;
  comment: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface SupplierAdvance {
  id: string;
  projectId: string;
  supplierId: string;
  fundingPaymentId: string;
  currency: Currency;
  fundedAmount: string;
  fundedAmountUzs: string;
  availableAmount: string;
  createdAt: string;
}

export interface SettlementAllocation {
  id: string;
  purchaseId: string;
  fundingPaymentId: string | null;
  advanceId: string | null;
  settlementCurrency: Currency;
  settlementAmount: string;
  settlementValueUzs: string;
  debtCurrency: Currency;
  settlementExchangeRate: string | null;
  debtAmountSettled: string;
  exchangeDifferenceUzs: string;
  effect: SettlementEffect;
  createdAt: string;
}

export interface CurrencyAmount {
  currency: Currency;
  amount: string;
}

export interface SupplierPurchaseSummary {
  id: string;
  currency: Currency;
  totalAmount: string;
  remainingDebt: string;
  cancelled: boolean;
  occurredAt: string;
}

export interface SupplierLedger {
  supplierId: string;
  outstandingDebt: CurrencyAmount[];
  availableAdvance: CurrencyAmount[];
  purchases: SupplierPurchaseSummary[];
}

export interface Warehouse {
  id: string;
  projectId: string;
  name: string;
  code: string;
  comment: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface MaterialCategory {
  id: string;
  projectId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface Unit {
  id: string;
  projectId: string;
  name: string;
  symbol: string;
  isActive: boolean;
  createdAt: string;
}

export interface Material {
  id: string;
  projectId: string;
  name: string;
  code: string;
  categoryId: string;
  unitId: string;
  minimumStock: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface InventoryBalance {
  id: string;
  projectId: string;
  warehouseId: string;
  warehouseName: string;
  materialId: string;
  materialName: string;
  unitId: string;
  unitSymbol: string;
  categoryId: string | null;
  quantity: string;
  averageCostUzs: string;
  valueUzs: string;
  minimumStock: string | null;
  lowStock: boolean;
  updatedAt: string;
}

export interface PurchaseItemInput {
  materialId: string;
  quantity: string;
  unitPrice: string;
}

export interface AdvanceAllocationInput {
  advanceId: string;
  amount: string;
  settlementExchangeRate?: string;
}

export interface PurchaseItem {
  id: string;
  lineNumber: number;
  materialId: string;
  materialNameSnapshot: string;
  quantity: string;
  unitPrice: string;
  lineAmount: string;
  lineAmountUzs: string;
}

export interface Purchase {
  id: string;
  projectId: string;
  supplierId: string;
  supplierNameSnapshot: string;
  warehouseId: string;
  warehouseNameSnapshot: string;
  currency: Currency;
  exchangeRate: string;
  rateSource: RateSource;
  rateId: string | null;
  rateOverrideReason: string | null;
  totalAmount: string;
  totalAmountUzs: string;
  remainingDebt: string;
  status: PurchaseStatus;
  invoiceNumber: string | null;
  comment: string | null;
  occurredAt: string;
  createdById: string;
  createdAt: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
  cancelledById: string | null;
  items: PurchaseItem[];
}

export interface WriteOff {
  id: string;
  projectId: string;
  warehouseId: string;
  warehouseNameSnapshot: string;
  materialId: string;
  materialNameSnapshot: string;
  blockId: string;
  blockNameSnapshot: string;
  floorId: string | null;
  floorLabelSnapshot: string | null;
  quantity: string;
  unitCostUzs: string;
  totalCostUzs: string;
  comment: string | null;
  occurredAt: string;
  createdById: string;
  createdAt: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
  cancelledById: string | null;
}

export type AttachmentStatus = "PENDING" | "READY" | "LINKED" | "FAILED";

/** Only these three target types exist server-side — see
 * plaza-api/src/modules/attachments/attachment-target.enum.ts. A
 * FINANCIAL_TRANSACTION target is only accepted for INCOME/EXPENSE rows
 * (not DEBT_PAYMENT/ADVANCE, which use SUPPLIER_PAYMENT instead). */
export type AttachmentTarget = "PURCHASE" | "FINANCIAL_TRANSACTION" | "SUPPLIER_PAYMENT";

export interface Attachment {
  id: string;
  projectId: string;
  status: AttachmentStatus;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById: string;
  createdAt: string;
  readyAt: string | null;
  linkedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  target: AttachmentTarget | null;
  targetId: string | null;
}

export interface AuditLog {
  id: string;
  projectId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  operationId: string | null;
  requestId: string | null;
  previousData: Record<string, unknown> | null;
  newData: Record<string, unknown>;
  createdAt: string;
}

export interface CashFlow {
  opening: string;
  periodInflow: string;
  periodOutflow: string;
  closing: string;
  current: string;
}

export interface CategoryAmount {
  categoryId: string;
  categoryName: string;
  amountUzs: string;
}

export interface AnalyticsSummary {
  projectId: string;
  dateFrom: string | null;
  dateTo: string | null;
  generatedAt: string;
  postingSequenceCutoff: string;
  cashUzs: CashFlow;
  cashUsd: CashFlow;
  expensesByCategory: CategoryAmount[];
  salariesUzs: string;
  purchasesTotalUzs: string;
  purchasesCount: number;
  supplierDebtAsOf: CurrencyAmount[];
  supplierAdvancesAvailableAsOf: CurrencyAmount[];
  currentInventoryValueUzs: string;
  inventoryValueAsOfUzs: string;
}

export interface MaterialAnalyticsRow {
  materialId: string;
  materialName: string;
  purchasedQuantity: string;
  purchasedValueUzs: string;
  consumedQuantity: string;
  consumedValueUzs: string;
}

export interface ConstructionAnalyticsRow {
  blockId: string;
  blockName: string;
  floorId: string | null;
  /** null when the material was written off against the whole block. */
  floorLabel: string | null;
  materialId: string;
  materialName: string;
  quantity: string;
  valueUzs: string;
}

