import { test, expect, type Page, type Browser, type APIRequestContext } from "@playwright/test";

/**
 * End-to-end coverage of the primary demo lifecycle against a REAL running
 * backend (see README "Running the demo locally"). Uses the seeded dev
 * accounts from plaza-api/prisma/seed.ts — test-only, never hardcoded into
 * application code itself (see lib/auth for the real login flow).
 */
const MANAGER = {
  email: "manager@euro-plaza.example",
  password: process.env.SEED_MANAGER_PASSWORD ?? "ChangeMe123!DevOnly",
};
const OWNER = {
  email: "owner@euro-plaza.example",
  password: process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123!DevOnly",
};
const ACCOUNTANT = {
  email: "accountant@euro-plaza.example",
  password: process.env.SEED_ACCOUNTANT_PASSWORD ?? "ChangeMe123!DevOnly",
};

async function login(page: Page, creds: { email: string; password: string }) {
  await page.goto("/login");
  await page.fill("#email", creds.email);
  await page.fill("#password", creds.password);
  await page.click("button[type=submit]");
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

async function selectByLabelId(page: Page, labelId: string, optionName: string | RegExp) {
  await page.locator(`button[aria-labelledby="${labelId}"]`).click();
  const exact = typeof optionName === "string";
  await page.getByRole("option", { name: optionName, exact }).click();
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/** Guarantees at least one USD currency rate exists so the "Курс из
 * списка" (referenced-rate) Select has a real option to test — talks to
 * the backend directly (not through the browser) since no UI exists to
 * add a rate, only to consume one. Ignored if one already exists for
 * today (unique-per-day constraint). */
async function ensureUsdRate(request: APIRequestContext) {
  const loginRes = await request.post(`${API_URL}/auth/login`, {
    data: { email: MANAGER.email, password: MANAGER.password },
  });
  const { accessToken, user } = await loginRes.json();
  if (!user.projectId) return;
  await request
    .post(`${API_URL}/projects/${user.projectId}/currency-rates`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { currency: "USD", rateUzs: "12450.00000000", effectiveOn: new Date().toISOString().slice(0, 10) },
    })
    .catch(() => {});
}

test.describe("auth", () => {
  test("login with wrong password shows a mapped message, not raw backend text", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", MANAGER.email);
    await page.fill("#password", "definitely-wrong");
    await page.click("button[type=submit]");
    const alert = page.locator('[role=alert], .text-destructive').first();
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test("login -> dashboard -> logout returns to login", async ({ page }) => {
    await login(page, MANAGER);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Выйти" }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });
  });
});

test.describe("role-based UI", () => {
  test("PROJECT_MANAGER sees the quick-action button; OWNER and ACCOUNTANT do not", async ({ page }) => {
    await login(page, MANAGER);
    await expect(page.locator('button[aria-label="Новая операция"]')).toBeVisible();
    await page.getByRole("button", { name: "Выйти" }).click();
    await page.waitForURL(/\/login$/);

    await login(page, OWNER);
    await expect(page.locator('button[aria-label="Новая операция"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Выйти" }).click();
    await page.waitForURL(/\/login$/);

    await login(page, ACCOUNTANT);
    await expect(page.locator('button[aria-label="Новая операция"]')).toHaveCount(0);
  });

  test("OWNER can switch projects; PROJECT_MANAGER cannot", async ({ page }) => {
    await login(page, OWNER);
    // Owner's project switcher is a real dropdown button (chevron icon).
    await expect(page.locator("header button", { hasText: /./ }).first()).toBeVisible();
    await page.getByRole("button", { name: "Выйти" }).click();
    await page.waitForURL(/\/login$/);

    await login(page, MANAGER);
    // Manager's switcher is plain text, no dropdown trigger button.
    await expect(page.locator('header [class*="justify-between"]')).toHaveCount(0);
  });

  test("OWNER and ACCOUNTANT have read access to analytics/audit/reports but no mutation controls", async ({
    page,
  }) => {
    for (const creds of [OWNER, ACCOUNTANT]) {
      await login(page, creds);
      for (const path of ["/analytics", "/audit", "/reports"]) {
        await page.goto(path);
        await expect(page.getByText(/Application error|Cannot read propert/i)).toHaveCount(0);
        await expect(page.locator("h1")).toBeVisible();
      }
      // Read-only: no upload control on a purchase detail page, and the
      // reports page still lets them download (READ, not a mutation).
      await page.goto("/purchases");
      const firstPurchase = page.locator('a[href^="/purchases/"]').first();
      if (await firstPurchase.count()) {
        await firstPurchase.click();
        await expect(page.locator('input[type=file]')).toHaveCount(0);
      }
      await page.getByRole("button", { name: "Выйти" }).click();
      await page.waitForURL(/\/login$/);
    }
  });
});

test.describe("core business flow (PROJECT_MANAGER)", () => {
  test.describe.configure({ mode: "serial" });
  const suffix = Date.now().toString().slice(-6);
  const supplierName = `Playwright Supplier ${suffix}`;
  const warehouseName = `Playwright Warehouse ${suffix}`;
  const materialName = `Playwright Material ${suffix}`;
  const blockName = `Playwright Block ${suffix}`;

  // One shared page/context for this whole serial flow: each test builds on
  // the state the previous one left behind (supplier -> advance -> purchase
  // -> write-off), and a fresh context per test would have to log in and
  // re-derive all of it.
  let page: Page;
  let purchaseUrl = "";

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("top up cash via a finance income transaction", async () => {
    await login(page, MANAGER);
    await page.goto("/finance/new?type=INCOME");
    await page.fill("#amount", "50000000");
    await page.fill("#party", `Playwright top-up ${suffix}`);
    const submit = page.locator('button[type=submit]');
    await submit.click();
    // Duplicate-submit prevention: the button disables itself immediately.
    await expect(submit).toBeDisabled();
    await page.waitForURL(/\/finance\/[a-f0-9-]+$/, { timeout: 15000 });
    await expect(page.getByText("сум")).toBeVisible();
  });

  test("create a supplier and fund an advance", async () => {
    await login(page, MANAGER);
    await page.goto("/suppliers");
    await page.click('button:has-text("Добавить")');
    await page.fill("#supplier-name", supplierName);
    await page.locator("form button[type=submit]").click();
    await page.waitForTimeout(600);
    await page.click(`text=${supplierName}`);
    await page.waitForURL(/\/suppliers\/[a-f0-9-]+$/);

    await page.click('button:has-text("Аванс")');
    await page.locator('input[inputmode=decimal]').first().fill("1000000");
    const submit = page.locator('button[type=submit]:has-text("Оформить аванс")');
    await submit.click();
    // The dialog stays open after success so a document can be attached to
    // the advance's SupplierPayment (target=SUPPLIER_PAYMENT) — see
    // supplier-detail-client.tsx's AdvanceDialog.
    await expect(page.getByRole("heading", { name: "Аванс оформлен" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Документы")).toBeVisible();
    await page.getByRole("button", { name: "Готово" }).click();
    await expect(page.getByText("1 000 000,00 сум")).toBeVisible();
  });

  test("create warehouse and material", async () => {
    await login(page, MANAGER);
    await page.goto("/warehouses");
    await page.click('button:has-text("Добавить")');
    await page.fill("#wh-name", warehouseName);
    await page.fill("#wh-code", `pw-wh-${suffix}`);
    await page.locator('form button:has-text("Создать")').click();
    await page.waitForTimeout(600);
    await expect(page.getByText(warehouseName)).toBeVisible();

    await page.goto("/materials");
    await page.click('button:has-text("Добавить")');
    const dlg = page.locator("[role=dialog], [data-slot=drawer-content]").last();
    await dlg.getByLabel("Название").fill(materialName);
    await dlg.getByLabel("Код (латиницей)").fill(`pw-mat-${suffix}`);
    await dlg.getByPlaceholder("Новая категория").fill(`Playwright Category ${suffix}`);
    await dlg.getByRole("button", { name: "Создать" }).first().click();
    await page.waitForTimeout(400);
    await dlg.getByText("Выберите единицу").click();
    await page.getByRole("option").first().click();
    await dlg.getByRole("button", { name: "Создать" }).last().click();
    await expect(page.getByText("Материал добавлен")).toBeVisible({ timeout: 10000 });
  });

  test("create purchase using advance + cash; stock and balances update", async () => {
    await login(page, MANAGER);
    await page.goto("/purchases/new");
    await page.getByText("Выберите поставщика", { exact: true }).click();
    await page.getByRole("option", { name: supplierName, exact: true }).click();
    await page.getByText("Выберите склад", { exact: true }).click();
    await page.getByRole("option", { name: warehouseName, exact: true }).click();
    await page.locator('button[aria-labelledby="purchase-materials-label"]').click();
    await page.getByRole("option", { name: materialName, exact: true }).click();
    await page.getByPlaceholder("Количество").fill("50");
    await page.getByPlaceholder("Цена за ед.").fill("40000");
    // total = 2,000,000: 1,000,000 advance + 1,000,000 cash.
    const advanceCheckbox = page.locator("input[type=checkbox]").first();
    if (await advanceCheckbox.count()) {
      await advanceCheckbox.check();
      await page.locator('input[placeholder="Сумма к использованию"]').fill("1000000");
    }
    await page.getByPlaceholder("0.00").fill("1000000");
    await page.locator('button[type=submit]:has-text("Оформить закупку")').click();
    await page.waitForURL(/\/purchases\/[a-f0-9-]+$/, { timeout: 15000 });
    purchaseUrl = page.url();
    await expect(page.getByText("Оплачено", { exact: true })).toBeVisible();

    await page.goto("/warehouses");
    await page.click(`text=${warehouseName}`);
    await page.waitForURL(/\/warehouses\/[a-f0-9-]+$/);
    await expect(page.getByText(materialName)).toBeVisible();
  });

  test("create the whole building at once: several blocks with their floors", async () => {
    await login(page, MANAGER);
    await page.goto("/settings/construction");
    await page.click('button:has-text("Блоки")');
    await page.fill("#blocks-prefix", blockName);
    await page.fill("#blocks-count", "3");
    await page.fill("#blocks-floor-count", "4");
    // The preview names every block before anything is sent.
    await expect(page.getByText(`${blockName} А, ${blockName} Б, ${blockName} В`)).toBeVisible();
    await page.locator('button[type=submit]:has-text("Создать")').click();

    // 3 blocks x 4 floors, one call.
    await expect(page.getByText(/Создано блоков: 3, этажей: 12/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(`${blockName} В`)).toBeVisible();

    // Floors are really there, numbered in order.
    await page.getByText(`${blockName} А`).click();
    await expect(page.getByText("Этаж 4")).toBeVisible();
  });

  test("add more floors to an existing block in one step", async () => {
    await login(page, MANAGER);
    await page.goto("/settings/construction");
    await page.getByText(`${blockName} Б`).click();
    await page.click('button:has-text("Добавить этажи")');
    await page.fill("#floors-count", "2");
    // Numbering continues after the four the block already has.
    await expect(page.getByText("Этаж 5, Этаж 6")).toBeVisible();
    await page.locator('button[type=submit]:has-text("Добавить")').click();
    await expect(page.getByText(/Добавлено 2 этажа/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Этаж 6")).toBeVisible();
  });

  test("write off material to a block/floor", async () => {
    await login(page, MANAGER);
    await page.goto("/write-offs/new");
    await selectByLabelId(page, "writeoff-warehouse-label", warehouseName);
    await selectByLabelId(page, "writeoff-material-label", new RegExp(materialName));
    await page.locator("input[inputmode=decimal]").last().fill("5");
    await selectByLabelId(page, "writeoff-block-label", `${blockName} А`);
    await selectByLabelId(page, "writeoff-floor-label", "Этаж 1");
    await page.locator('button[type=submit]:has-text("Оформить списание")').click();
    await page.waitForURL(/\/write-offs\/[a-f0-9-]+$/, { timeout: 15000 });
    await expect(page.getByText(materialName)).toBeVisible();
    await expect(page.getByText(/Этаж 1/)).toBeVisible();
  });

  test("write off material to a whole block, with no floor at all", async () => {
    await login(page, MANAGER);
    await page.goto("/write-offs/new");
    await selectByLabelId(page, "writeoff-warehouse-label", warehouseName);
    await selectByLabelId(page, "writeoff-material-label", new RegExp(materialName));
    await page.locator("input[inputmode=decimal]").last().fill("3");
    await selectByLabelId(page, "writeoff-block-label", `${blockName} Б`);
    await selectByLabelId(page, "writeoff-floor-label", "Весь блок");
    await page.locator('button[type=submit]:has-text("Оформить списание")').click();
    await page.waitForURL(/\/write-offs\/[a-f0-9-]+$/, { timeout: 15000 });
    // The detail page says "весь блок" rather than showing an empty floor.
    await expect(page.getByText(/весь блок/)).toBeVisible();

    await page.goto("/analytics");
    await page.getByRole("tab", { name: "Объекты" }).click();
    await expect(page.getByText(new RegExp(`${blockName} Б / весь блок`))).toBeVisible({ timeout: 15000 });
  });

  test("Construction analytics: \"Весь блок\" filter isolates whole-block write-offs from floor-specific ones", async () => {
    await login(page, MANAGER);
    await page.goto("/analytics");
    await page.getByRole("tab", { name: "Объекты" }).click();
    // Radix's Select trigger is a <button> but exposes role="combobox" —
    // not the generic "button" role.
    await page.getByRole("combobox", { name: "Блок" }).click();
    await page.getByRole("option", { name: `${blockName} Б`, exact: true }).click();

    // "Весь блок" — the new explicit filter — shows only the block's
    // floorId=null write-off, never a floor-specific one.
    await page.getByRole("combobox", { name: "Этаж" }).click();
    await page.getByRole("option", { name: "Весь блок", exact: true }).click();
    await expect(page.getByText(new RegExp(`${blockName} Б / весь блок`))).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Этаж \d/)).toHaveCount(0);

    // A specific floor of the same block (nothing was ever written off
    // there) renders the empty state instead of the whole-block row —
    // proves the filter actually discriminates rather than "весь блок"
    // text merely appearing somewhere on the page regardless of filter.
    await page.getByRole("combobox", { name: "Этаж" }).click();
    await page.getByRole("option", { name: "Этаж 1", exact: true }).click();
    await expect(page.getByText("Данных за период нет")).toBeVisible({ timeout: 15000 });
  });

  test("every list page renders its rows without a runtime error", async () => {
    // Regression guard: a prior version of these pages read a paginated
    // response's `.items` field, which doesn't exist on the live API (it
    // returns `.data` — see lib/api/types.ts). That crashed each list page
    // with "Cannot read properties of undefined" while every other test
    // here only ever visited detail pages, so the bug went undetected.
    // This test's only job is to catch that class of mismatch again.
    for (const path of ["/finance", "/purchases", "/write-offs", "/history", "/analytics", "/audit", "/reports"]) {
      await page.goto(path);
      await expect(page.getByText(/Application error|Cannot read propert/i)).toHaveCount(0);
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("upload and download an attachment on the purchase", async () => {
    await login(page, MANAGER);
    await page.goto(purchaseUrl);
    await expect(page.getByText("Документы")).toBeVisible();

    await page.locator('input[type=file]').setInputFiles({
      name: "invoice.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%%EOF"),
    });
    await expect(page.getByText("invoice.pdf")).toBeVisible({ timeout: 10000 });

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/attachments/") && r.url().includes("/download")),
      page.getByLabel("Скачать файл").first().click(),
    ]);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
  });

  test("analytics summary reflects real project data", async () => {
    await login(page, MANAGER);
    await page.goto("/analytics");
    await expect(page.getByText("Этот месяц")).toBeVisible();
    // KPI row must show a real computed balance, not a stuck loading/error state.
    await expect(page.getByRole("tabpanel", { name: "Сводка" }).getByText("Касса", { exact: true })).toBeVisible();
    await expect(page.getByText(/\d[\d\s]*,\d\d\s*сум/).first()).toBeVisible({ timeout: 10000 });
  });

  test("audit log shows readable entries, never a raw JSON dump by default", async () => {
    await login(page, MANAGER);
    await page.goto("/audit");
    await expect(page.getByText("Записей не найдено")).toHaveCount(0);
    await expect(page.locator('pre')).toHaveCount(0); // collapsed by default
  });

  test("XLSX report downloads a real spreadsheet file", async () => {
    await login(page, MANAGER);
    await page.goto("/reports");
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/reports/") && r.url().includes(".xlsx")),
      page.locator('button:has-text("Скачать")').first().click(),
    ]);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("spreadsheetml");
  });

  test("cancelling the purchase is blocked with a clean dependency message", async () => {
    await login(page, MANAGER);
    await page.goto(purchaseUrl);
    await page.locator('button:has-text("Отменить закупку")').click();
    await page.getByPlaceholder("Укажите причину отмены").fill("Playwright dependency check");
    await page.locator('button:has-text("Отменить"):visible').last().click();
    await expect(
      page.getByText("Закупку нельзя отменить: материалы уже использованы."),
    ).toBeVisible({ timeout: 10000 });
    // Never the raw backend code/message.
    await expect(page.getByText("PURCHASE_HAS_DEPENDENT_MOVEMENTS")).toHaveCount(0);
  });
});

test.describe("supplier taxpayer id and search", () => {
  test.describe.configure({ mode: "serial" });
  const suffix = Date.now().toString().slice(-6);
  const withTaxId = `ИНН Поставщик ${suffix}`;
  const withoutTaxId = `Без ИНН ${suffix}`;
  // Unique per run, and deliberately starts with a zero: these tests run
  // against a real database that keeps everything earlier runs created, and
  // a leading zero is exactly what a numeric column would have eaten.
  const taxId = `0${suffix}12`;

  let page: Page;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("a supplier is created with an ИНН and shows it in the list", async () => {
    await login(page, MANAGER);
    await page.goto("/suppliers");
    await page.click('button:has-text("Добавить")');
    await page.fill("#supplier-name", withTaxId);
    await page.fill("#supplier-tax-id", taxId);
    await expect(page.locator("#supplier-tax-id")).toHaveValue(taxId);
    await page.locator("[role=dialog], [data-slot=drawer-content]").last()
      .locator("button[type=submit]").click();
    await expect(page.getByText(`ИНН ${taxId}`)).toBeVisible({ timeout: 10000 });

    await page.click('button:has-text("Добавить")');
    await page.fill("#supplier-name", withoutTaxId);
    await page.locator("[role=dialog], [data-slot=drawer-content]").last()
      .locator("button[type=submit]").click();
    await expect(page.getByText(withoutTaxId)).toBeVisible({ timeout: 10000 });
  });

  test("a partially typed ИНН blocks submit instead of reaching a 400", async () => {
    await login(page, MANAGER);
    await page.goto("/suppliers");
    await page.click('button:has-text("Добавить")');
    await page.fill("#supplier-name", `Неполный ИНН ${suffix}`);
    // The mask drops non-digits, so four characters is all that lands.
    await page.fill("#supplier-tax-id", "12ab34");
    await expect(page.locator("#supplier-tax-id")).toHaveValue("1234");
    await expect(page.getByText("ИНН состоит из 9 цифр")).toBeVisible();
    const submit = page.locator("[role=dialog], [data-slot=drawer-content]").last()
      .locator("button[type=submit]");
    await expect(submit).toBeDisabled();
  });

  test("search narrows the list by name and by ИНН", async () => {
    await login(page, MANAGER);
    await page.goto("/suppliers");
    const search = page.getByLabel("Поиск поставщиков");

    await search.fill(taxId);
    await expect(page.getByText(withTaxId)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(withoutTaxId)).toHaveCount(0);

    await search.fill(withoutTaxId);
    await expect(page.getByText(withoutTaxId)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(withTaxId)).toHaveCount(0);

    await search.fill("совершенно точно ничего");
    await expect(page.getByText("Поставщики не найдены")).toBeVisible({ timeout: 10000 });

    await search.fill("");
    await expect(page.getByText(withTaxId)).toBeVisible({ timeout: 10000 });
  });

  test("an existing supplier can be given an ИНН afterwards", async () => {
    await login(page, MANAGER);
    await page.goto("/suppliers");
    await page.getByLabel("Поиск поставщиков").fill(withoutTaxId);
    await page.getByText(withoutTaxId).click();
    await page.waitForURL(/\/suppliers\/[a-f0-9-]+$/);

    await page.getByRole("button", { name: "Изменить поставщика" }).click();
    await page.fill("#edit-supplier-tax-id", "987654321");
    await page.locator("[role=dialog], [data-slot=drawer-content]").last()
      .locator("button[type=submit]").click();
    await expect(page.getByText("ИНН 987654321")).toBeVisible({ timeout: 10000 });

    // And the new id is immediately searchable.
    await page.goto("/suppliers");
    await page.getByLabel("Поиск поставщиков").fill("987654321");
    await expect(page.getByText(withoutTaxId)).toBeVisible({ timeout: 10000 });
  });
});

test.describe("creating master data from inside the purchase form", () => {
  // A purchase is often the moment a supplier, a warehouse or a material is
  // first entered at all. Each "+" creates the record and selects it without
  // leaving the half-filled form.
  test("supplier, warehouse and material can all be created inline and are auto-selected", async ({
    page,
  }) => {
    const suffix = Date.now().toString().slice(-6);
    const supplierName = `Inline Supplier ${suffix}`;
    const warehouseName = `Inline Warehouse ${suffix}`;
    const materialName = `Inline Material ${suffix}`;

    await login(page, MANAGER);
    await page.goto("/purchases/new");

    // Typing into the form first: none of it may be lost to the dialogs.
    await page.getByLabel("№ накладной").fill(`INV-${suffix}`);

    await page.getByRole("button", { name: "Новый поставщик" }).click();
    const supplierDlg = page.locator("[role=dialog], [data-slot=drawer-content]").last();
    await page.fill("#supplier-name", supplierName);
    await supplierDlg.locator("button[type=submit]").click();
    // Assert on the Select trigger, not getByText — Radix also renders a
    // hidden native <option> with the same text for form autofill.
    await expect(page.locator('button[aria-labelledby="purchase-supplier-label"]')).toHaveText(
      supplierName,
      { timeout: 10000 },
    );

    await page.getByRole("button", { name: "Новый склад" }).click();
    const warehouseDlg = page.locator("[role=dialog], [data-slot=drawer-content]").last();
    // The code is transliterated from the name — never typed twice.
    await page.fill("#wh-name", warehouseName);
    await expect(page.locator("#wh-code")).toHaveValue(/inline-warehouse-\d+/);
    await warehouseDlg.locator("button[type=submit]").click();
    await expect(page.locator('button[aria-labelledby="purchase-warehouse-label"]')).toHaveText(
      warehouseName,
      { timeout: 10000 },
    );

    await page.getByRole("button", { name: "Новый материал" }).click();
    const dlg = page.locator("[role=dialog], [data-slot=drawer-content]").last();
    await dlg.getByLabel("Название").fill(materialName);
    await expect(dlg.getByLabel("Код (латиницей)")).toHaveValue(/inline-material-\d+/);
    await dlg.getByPlaceholder("Новая категория").fill(`Inline Category ${suffix}`);
    await dlg.getByRole("button", { name: "Создать" }).first().click();
    await page.waitForTimeout(400);
    await dlg.getByText("Выберите единицу").click();
    await page.getByRole("option").first().click();
    await dlg.getByRole("button", { name: "Создать" }).last().click();
    await expect(page.locator('button[aria-labelledby="purchase-materials-label"]')).toHaveText(
      materialName,
      { timeout: 10000 },
    );

    // All three are selected in the form, and nothing typed earlier was lost.
    await expect(page.getByLabel("№ накладной")).toHaveValue(`INV-${suffix}`);
    await page.getByPlaceholder("Количество").fill("10");
    await page.getByPlaceholder("Цена за ед.").fill("1000");
    await page.locator('button[type=submit]:has-text("Оформить закупку")').click();
    await page.waitForURL(/\/purchases\/[a-f0-9-]+$/, { timeout: 15000 });
  });
});

test.describe("login password visibility", () => {
  test("eye icon toggles input type and preserves the typed value", async ({ page }) => {
    await page.goto("/login");
    const passwordInput = page.locator("#password");
    await passwordInput.fill("correct-horse-battery");
    await expect(passwordInput).toHaveAttribute("type", "password");

    await page.getByRole("button", { name: "Показать пароль" }).click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await expect(passwordInput).toHaveValue("correct-horse-battery");

    await page.getByRole("button", { name: "Скрыть пароль" }).click();
    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(passwordInput).toHaveValue("correct-horse-battery");
  });
});

test.describe("quick-action routing regression", () => {
  // Regression guard for the exact reported sequence: opening the FAB and
  // picking a different operation type while /finance/new is already the
  // mounted route must switch tabs and reset fields every time — not just
  // on the first open, and not only when the in-page Tabs are clicked
  // directly (that path always worked; only FAB -> FAB re-navigation
  // exposed the bug — see app/(protected)/finance/new/page.tsx).
  test("FAB Доход -> Расход -> Зарплата -> Доход always opens the matching tab with fields reset", async ({
    page,
  }) => {
    await login(page, MANAGER);
    await page.goto("/dashboard");

    async function openViaFab(label: string) {
      await page.locator('button[aria-label="Новая операция"]').click();
      await page.getByRole("button", { name: label, exact: true }).click();
    }

    await openViaFab("Доход");
    await expect(page).toHaveURL(/type=INCOME/);
    await expect(page.getByRole("tab", { name: "Доход" })).toHaveAttribute("data-state", "active");
    await page.fill("#amount", "12345");

    await openViaFab("Расход");
    await expect(page).toHaveURL(/type=EXPENSE/);
    await expect(page.getByRole("tab", { name: "Расход" })).toHaveAttribute("data-state", "active");
    await expect(page.locator("#amount")).toHaveValue("");
    await page.fill("#amount", "999");

    await openViaFab("Зарплата");
    await expect(page).toHaveURL(/type=SALARY/);
    await expect(page.getByRole("tab", { name: "Зарплата" })).toHaveAttribute("data-state", "active");
    await expect(page.locator("#amount")).toHaveValue("");

    await openViaFab("Доход");
    await expect(page).toHaveURL(/type=INCOME/);
    await expect(page.getByRole("tab", { name: "Доход" })).toHaveAttribute("data-state", "active");
    await expect(page.locator("#amount")).toHaveValue("");
  });
});

test.describe("exchange-rate select (vaul drawer)", () => {
  test("referenced-rate dropdown opens and an option is selectable inside the mobile advance drawer; manual entry still works", async ({
    page,
    request,
  }) => {
    await ensureUsdRate(request);
    await login(page, MANAGER);

    const suffix = Date.now().toString().slice(-6);
    const supplierName = `Playwright Rate Supplier ${suffix}`;
    await page.goto("/suppliers");
    await page.click('button:has-text("Добавить")');
    await page.fill("#supplier-name", supplierName);
    await page.locator("form button[type=submit]").click();
    await page.waitForTimeout(600);
    await page.click(`text=${supplierName}`);
    await page.waitForURL(/\/suppliers\/[a-f0-9-]+$/);

    await page.click('button:has-text("Аванс")');
    await page.locator('button[aria-label="Валюта"]').click();
    await page.getByRole("option", { name: "USD", exact: true }).click();

    // The bug: this Select visually looked like a dropdown, but its
    // options weren't clickable because vaul's drawer-drag recognizer
    // intercepted the pointer. Regression guard: open it and click a real
    // option (data-vaul-no-drag fix in components/ui/select.tsx).
    await page.getByText("Выберите курс", { exact: true }).click();
    await page.getByRole("option").first().click();
    await expect(page.getByText("Выберите курс", { exact: true })).toHaveCount(0);

    // Manual entry remains available as an explicit alternative.
    await page.getByText("Свой курс", { exact: true }).click();
    const manualRateInput = page.getByPlaceholder("Курс, сум за 1 USD");
    await manualRateInput.fill("12500");
    await page.getByPlaceholder("Причина ручного ввода курса").fill("Playwright manual rate check");
    // DecimalInput groups digits for display; the submitted value stays raw.
    await expect(manualRateInput).toHaveValue("12 500");
  });
});

test.describe("combined cash view", () => {
  test("shows a UZS/USD toggle and a computed total or an explicit manual-rate prompt, never a stuck blank state", async ({
    page,
    request,
  }) => {
    await ensureUsdRate(request);
    await login(page, MANAGER);
    await page.goto("/finance");

    await expect(page.getByText("Общая касса")).toBeVisible();
    await expect(page.getByText(/По курсу: 1 USD =|Курс USD\/UZS ещё не задан/)).toBeVisible({ timeout: 10000 });

    const usdToggle = page.getByRole("button", { name: "USD", exact: true }).first();
    await usdToggle.click();
    await expect(page.getByText("$").first()).toBeVisible();
  });
});

test.describe("analytics resilience", () => {
  test("a period with zero transactions renders an explicit empty state, never a fabricated axis or crash", async ({
    page,
  }) => {
    await login(page, MANAGER);
    await page.goto("/analytics");
    await page.fill("#analytics-date-from", "2000-01-01");
    await page.fill("#analytics-date-to", "2000-01-02");
    await expect(page.getByText(/Application error|Cannot read propert/i)).toHaveCount(0);
    await expect(page.getByText("Операций за период нет")).toBeVisible({ timeout: 10000 });
  });

  test("a populated period renders the chart sections with real data", async ({ page }) => {
    await login(page, MANAGER);
    await page.goto("/analytics");
    await page.click('button:has-text("Этот месяц")');
    await expect(page.getByText("Приход и расход за период")).toBeVisible();
    await expect(page.getByText("Расходы по категориям")).toBeVisible();
  });
});

test.describe("profile settings", () => {
  test("name updates, persists after reload, and role/project are never an editable control", async ({ page }) => {
    await login(page, MANAGER);
    await page.goto("/profile");

    const nameInput = page.locator("#profile-name");
    const original = await nameInput.inputValue();
    const updated = `${original} (pw-test)`;

    await nameInput.fill(updated);
    await page.locator('form:has(#profile-name) button[type=submit]').click();
    await expect(page.getByText("Имя обновлено")).toBeVisible({ timeout: 10000 });
    await page.reload();
    await expect(page.locator("#profile-name")).toHaveValue(updated);

    // Role/project are read-only <dd> text — no select/combobox for them.
    await expect(page.getByText("Роль", { exact: true })).toBeVisible();
    await expect(page.locator("[role=combobox]")).toHaveCount(0);
    await expect(page.locator("select")).toHaveCount(0);

    // Revert so the display name stays stable across runs.
    await nameInput.fill(original);
    await page.locator('form:has(#profile-name) button[type=submit]').click();
    await expect(page.getByText("Имя обновлено")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("profile password change", () => {
  test.describe.configure({ mode: "serial" });
  const tempPassword = "TempPlaywright#2026";
  let page: Page;

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("wrong current password is rejected with the mapped message, never the raw backend code", async () => {
    await login(page, ACCOUNTANT);
    await page.goto("/profile");
    await page.fill("#current-password", "definitely-wrong");
    await page.fill("#new-password", tempPassword);
    await page.fill("#confirm-password", tempPassword);
    await page.locator('button:has-text("Сменить пароль")').click();
    await expect(page.getByText("Неверный текущий пароль.")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("INVALID_CURRENT_PASSWORD")).toHaveCount(0);
  });

  test("a correct change succeeds, the new password logs in, and it is reverted for future runs", async () => {
    await page.fill("#current-password", ACCOUNTANT.password);
    await page.fill("#new-password", tempPassword);
    await page.fill("#confirm-password", tempPassword);
    await page.locator('button:has-text("Сменить пароль")').click();
    await expect(page.getByText("Пароль изменён. Другие устройства вышли из системы.")).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Выйти" }).click();
    await page.waitForURL(/\/login$/);
    await login(page, { email: ACCOUNTANT.email, password: tempPassword });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Revert so the seeded credential stays stable for other tests / reruns.
    await page.goto("/profile");
    await page.fill("#current-password", tempPassword);
    await page.fill("#new-password", ACCOUNTANT.password);
    await page.fill("#confirm-password", ACCOUNTANT.password);
    await page.locator('button:has-text("Сменить пароль")').click();
    await expect(page.getByText("Пароль изменён. Другие устройства вышли из системы.")).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: "Выйти" }).click();
    await page.waitForURL(/\/login$/);
    await login(page, ACCOUNTANT);
  });
});
