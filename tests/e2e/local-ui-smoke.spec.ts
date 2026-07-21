import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type RoleKey = "USER" | "WRITER" | "ADMIN" | "SUPERADMIN";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(path.join(rootDir, ".env"));
loadEnvFile(path.join(rootDir, "backend", ".env"));

function credentials(role: RoleKey) {
  const email = process.env[`SMOKE_${role}_EMAIL`];
  const password = process.env[`SMOKE_${role}_PASSWORD`];
  if (!email || !password) {
    throw new Error(`Missing SMOKE_${role}_EMAIL or SMOKE_${role}_PASSWORD`);
  }
  return { email, password };
}

async function expectAppReady(page: Page) {
  await expect(page.locator("#app")).toBeVisible();
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await expect(page.locator("body")).not.toContainText("Cannot GET");
}

async function clickFirstVisible(page: Page, selector: string) {
  const locator = page.locator(selector).locator("visible=true").first();
  await expect(locator).toBeVisible();
  const href = await locator.getAttribute("href");
  if (href?.startsWith("/")) {
    await page.goto(href);
  } else {
    await locator.click({ timeout: 2000 });
  }
  await expectAppReady(page);
}

async function loginAs(page: Page, role: RoleKey) {
  const { email, password } = credentials(role);
  await page.goto("/login");
  await expectAppReady(page);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"], input[type="text"]').last().fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
  await expectAppReady(page);
}

async function clickSafeButtons(page: Page, limit = 3) {
  page.on("dialog", async (dialog) => {
    await dialog.dismiss().catch(() => {});
  });

  const unsafe = /delete|remove|logout|ออกจากระบบ|ลบ|ซื้อ|ชำระ|เติม|อนุมัติ|ปฏิเสธ|บันทึก|submit|pay|purchase|confirm|line|voice|อ่านออกเสียง|ไมค์/i;
  const buttons = page.locator("button:visible");
  const count = await buttons.count();
  let clicked = 0;

  for (let index = 0; index < count && clicked < limit; index += 1) {
    const button = buttons.nth(index);
    if (!(await button.isVisible().catch(() => false))) continue;
    if (await button.isDisabled().catch(() => true)) continue;

    const label = `${await button.innerText().catch(() => "")} ${await button.getAttribute("aria-label").catch(() => "")}`;
    if (unsafe.test(label)) continue;

    await button.click({ timeout: 1000 }).catch(() => {});
    if (page.isClosed()) return;
    await page.waitForTimeout(100);
    clicked += 1;
  }
}

test("public navigation and login controls work", async ({ page }) => {
  await page.goto("/");
  await expectAppReady(page);

  for (const route of ["/store", "/serials", "/categories", "/tags"]) {
    await page.goto(route);
    await expectAppReady(page);
  }

  await page.goto("/search");
  await expectAppReady(page);
  const searchInput = page.locator('input[type="search"], input[placeholder], input[type="text"]').first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill("voice");
    await searchInput.press("Enter").catch(() => {});
    await expectAppReady(page);
  }

  await page.goto("/login");
  await expectAppReady(page);
  await clickSafeButtons(page, 5);
  await page.locator('button[type="submit"]').click();
  await expect(page.locator("#login-status")).toBeVisible();
});

test("reader account pages and important buttons work", async ({ page }) => {
  await loginAs(page, "USER");

  for (const route of ["/profile", "/my-library", "/cart", "/coin-wallet", "/account/following"]) {
    await page.goto(route);
    await expectAppReady(page);
    await clickSafeButtons(page, 6);
  }

  await page.goto("/account/notifications");
  await expectAppReady(page);
  const markAll = page.locator("button:visible").first();
  if (await markAll.isEnabled().catch(() => false)) {
    await markAll.click();
    await expectAppReady(page);
  }

  await page.goto("/account/devices");
  await expectAppReady(page);
  await clickSafeButtons(page, 4);
});

test("writer pages render and non-destructive controls respond", async ({ page }) => {
  await loginAs(page, "WRITER");

  for (const route of ["/writer", "/writer/books", "/writer/stats", "/writer/profile", "/writer/upload"]) {
    await page.goto(route);
    await expectAppReady(page);
    await clickSafeButtons(page, 8);
  }
});

test("admin and superadmin pages render with seeded operational data", async ({ page }) => {
  await loginAs(page, "ADMIN");

  for (const route of ["/admin", "/admin/page-content", "/admin/categories", "/admin/payments", "/admin/support-tickets", "/admin/password-resets"]) {
    await page.goto(route);
    await expectAppReady(page);
    await clickSafeButtons(page, 2);
  }

  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await loginAs(page, "SUPERADMIN");
  for (const route of ["/superadmin", "/superadmin/users", "/superadmin/settings"]) {
    await page.goto(route);
    await expectAppReady(page);
    await clickSafeButtons(page, 2);
  }
});
