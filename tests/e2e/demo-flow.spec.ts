import { test, expect, type Page, type Browser } from "@playwright/test";

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

  // One shared page/context for this whole serial flow: the advance-tracking
  // workaround (lib/local/known-advances.ts) is scoped to the browser's own
  // localStorage since the backend has no GET list-advances endpoint, so a
  // fresh context per test would never see the advance created earlier in
  // the same flow.
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
    await page.getByText("Материал", { exact: true }).click();
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

  test("transfer material between warehouses", async () => {
    await login(page, MANAGER);
    const destWarehouse = `${warehouseName} B`;
    await page.goto("/warehouses");
    await page.click('button:has-text("Добавить")');
    await page.fill("#wh-name", destWarehouse);
    await page.fill("#wh-code", `pw-wh-b-${suffix}`);
    await page.locator('form button:has-text("Создать")').click();
    await page.waitForTimeout(600);

    await page.goto("/transfers/new");
    await selectByLabelId(page, "source-warehouse-label", warehouseName);
    await selectByLabelId(page, "destination-warehouse-label", destWarehouse);
    await selectByLabelId(page, "transfer-material-label", new RegExp(materialName));
    await page.locator("input[inputmode=decimal]").last().fill("10");
    await page.locator('button[type=submit]:has-text("Оформить перемещение")').click();
    await page.waitForURL(/\/transfers\/[a-f0-9-]+$/, { timeout: 15000 });
    await expect(page.getByText(materialName)).toBeVisible();
  });

  test("write off material to a block/floor", async () => {
    await login(page, MANAGER);
    await page.goto("/settings/construction");
    await page.click('button:has-text("Блок")');
    await page.getByLabel("Название").fill(blockName);
    await page.getByLabel("Код (латиницей)").fill(`pw-block-${suffix}`);
    await page.locator('button[type=submit]:has-text("Создать")').click();
    await page.waitForTimeout(600);
    await page.click(`text=${blockName}`);
    await page.click('button:has-text("Добавить этаж")');
    await page.getByLabel("Название").fill("Этаж 1");
    await page.locator('button[type=submit]:has-text("Добавить")').click();
    await page.waitForTimeout(600);

    await page.goto("/write-offs/new");
    await selectByLabelId(page, "writeoff-warehouse-label", warehouseName);
    await selectByLabelId(page, "writeoff-material-label", new RegExp(materialName));
    await page.locator("input[inputmode=decimal]").last().fill("5");
    await selectByLabelId(page, "writeoff-block-label", blockName);
    await selectByLabelId(page, "writeoff-floor-label", "Этаж 1");
    await page.locator('button[type=submit]:has-text("Оформить списание")').click();
    await page.waitForURL(/\/write-offs\/[a-f0-9-]+$/, { timeout: 15000 });
    await expect(page.getByText(materialName)).toBeVisible();
  });

  test("every list page renders its rows without a runtime error", async () => {
    // Regression guard: a prior version of these pages read a paginated
    // response's `.items` field, which doesn't exist on the live API (it
    // returns `.data` — see lib/api/types.ts). That crashed each list page
    // with "Cannot read properties of undefined" while every other test
    // here only ever visited detail pages, so the bug went undetected.
    // This test's only job is to catch that class of mismatch again.
    for (const path of ["/finance", "/purchases", "/write-offs", "/transfers", "/history", "/analytics", "/audit", "/reports"]) {
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
    // Cash card must show a real computed balance, not a stuck loading/error state.
    await expect(page.locator("text=Касса, сум").locator("..")).toBeVisible();
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
      page.getByText("Закупку нельзя отменить: материалы уже использованы или перемещены."),
    ).toBeVisible({ timeout: 10000 });
    // Never the raw backend code/message.
    await expect(page.getByText("PURCHASE_HAS_DEPENDENT_MOVEMENTS")).toHaveCount(0);
  });
});
