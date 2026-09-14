/** Centralized query key factory, namespaced by projectId so a project
 * switch can precisely clear every project-scoped cache entry. */
export const qk = {
  projects: {
    list: () => ["projects"] as const,
    detail: (projectId: string) => ["projects", projectId] as const,
  },
  construction: {
    blocks: (projectId: string) => ["construction", projectId, "blocks"] as const,
    floors: (projectId: string, blockId: string) =>
      ["construction", projectId, "blocks", blockId, "floors"] as const,
  },
  finance: {
    balance: (projectId: string) => ["finance", projectId, "balance"] as const,
    list: (projectId: string, filters: object) =>
      ["finance", projectId, "list", filters] as const,
    detail: (projectId: string, id: string) => ["finance", projectId, "detail", id] as const,
    categories: (projectId: string) => ["finance", projectId, "categories"] as const,
    currencyRates: (projectId: string) => ["finance", projectId, "currency-rates"] as const,
  },
  suppliers: {
    list: (projectId: string) => ["suppliers", projectId, "list"] as const,
    detail: (projectId: string, id: string) => ["suppliers", projectId, "detail", id] as const,
    ledger: (projectId: string, id: string) => ["suppliers", projectId, "ledger", id] as const,
  },
  inventory: {
    warehouses: (projectId: string) => ["inventory", projectId, "warehouses"] as const,
    warehouseDetail: (projectId: string, id: string) =>
      ["inventory", projectId, "warehouses", id] as const,
    materials: (projectId: string, filters: object) =>
      ["inventory", projectId, "materials", filters] as const,
    materialCategories: (projectId: string) =>
      ["inventory", projectId, "material-categories"] as const,
    units: (projectId: string) => ["inventory", projectId, "units"] as const,
    balances: (projectId: string, filters: object) =>
      ["inventory", projectId, "balances", filters] as const,
  },
  purchases: {
    list: (projectId: string, filters: object) =>
      ["purchases", projectId, "list", filters] as const,
    detail: (projectId: string, id: string) => ["purchases", projectId, "detail", id] as const,
  },
  writeOffs: {
    list: (projectId: string, filters: object) =>
      ["write-offs", projectId, "list", filters] as const,
    detail: (projectId: string, id: string) => ["write-offs", projectId, "detail", id] as const,
  },
  transfers: {
    list: (projectId: string, filters: object) =>
      ["transfers", projectId, "list", filters] as const,
    detail: (projectId: string, id: string) => ["transfers", projectId, "detail", id] as const,
  },
} as const;

/** Root namespaces to clear entirely when the active project changes. */
export const PROJECT_SCOPED_NAMESPACES = [
  "construction",
  "finance",
  "suppliers",
  "inventory",
  "purchases",
  "write-offs",
  "transfers",
] as const;
