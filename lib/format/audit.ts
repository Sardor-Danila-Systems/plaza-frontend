/**
 * `action`/`entityType` are ad-hoc per-module string literals server-side —
 * there is no canonical enum to translate exhaustively (confirmed by
 * reading the Phase 9-13 source). This humanizes the domain terms we do
 * know for certain from this app's own flows and falls back to a
 * best-effort readable form for anything else, rather than a curated but
 * incomplete dropdown.
 */
const ENTITY_LABELS: Record<string, string> = {
  Purchase: "Закупка",
  FinancialTransaction: "Финансовая операция",
  Attachment: "Файл",
  Supplier: "Поставщик",
  SupplierAdvance: "Аванс поставщику",
  SupplierPayment: "Оплата поставщику",
  Warehouse: "Склад",
  Material: "Материал",
  MaterialCategory: "Категория материалов",
  StockWriteOff: "Списание",
  WarehouseTransfer: "Перемещение",
  BuildingBlock: "Блок",
  Floor: "Этаж",
  TransactionCategory: "Категория операций",
  CurrencyRate: "Курс валюты",
  Unit: "Единица измерения",
};

const ACTION_VERBS: Record<string, string> = {
  create: "Создание",
  cancel: "Отмена",
  update: "Изменение",
  upload: "Загрузка",
  link: "Привязка",
  delete: "Удаление",
  remove: "Удаление",
};

function splitPascalCase(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function humanizeEntityType(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? splitPascalCase(entityType);
}

export function humanizeAction(action: string, entityType: string): string {
  const verb = action.includes(".") ? action.split(".").pop()! : action;
  const label = ACTION_VERBS[verb];
  return label ? `${label}: ${humanizeEntityType(entityType)}` : action;
}
