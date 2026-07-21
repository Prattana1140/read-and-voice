# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: local-ui-smoke.spec.ts >> writer pages render and non-destructive controls respond
- Location: tests\e2e\local-ui-smoke.spec.ts:138:1

# Error details

```
TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic "ลิงก์ข้ามเนื้อหา" [ref=e4]:
    - link "ข้ามไปยังเนื้อหาหลัก" [ref=e5] [cursor=pointer]:
      - /url: "#app-main"
    - link "ข้ามไปยังเมนูนำทาง" [ref=e6] [cursor=pointer]:
      - /url: "#site-navigation"
  - banner [ref=e7]:
    - generic [ref=e8]:
      - generic [ref=e9]:
        - button "เมนูหลัก" [ref=e10] [cursor=pointer]:
          - img [ref=e11]
        - link "หน้าแรก" [ref=e13] [cursor=pointer]:
          - /url: /
          - img "Read and Voice" [ref=e14]
      - generic [ref=e15]:
        - button "ค้นหาหนังสือ นักเขียน หรือหมวดหมู่" [ref=e16] [cursor=pointer]:
          - img [ref=e17]
        - group [ref=e19]:
          - generic "เปลี่ยนธีมการแสดงผล" [ref=e20] [cursor=pointer]:
            - img [ref=e21]
        - button "เปิดหรือปิดตัวช่วยการเข้าถึง" [ref=e23] [cursor=pointer]:
          - img [ref=e24]
        - group [ref=e26]:
          - generic "เมนูบัญชี" [ref=e27] [cursor=pointer]:
            - img [ref=e28]
    - search:
      - generic:
        - img
        - searchbox "ค้นหาหนังสือ นักเขียน หรือหมวดหมู่"
        - button "กลับ":
          - img
    - generic:
      - generic:
        - button "กลับ":
          - img
        - link "Read and Voice":
          - /url: /
          - img "Read and Voice"
      - generic:
        - heading "เมนูหลัก" [level=3]
        - link "หน้าแรก":
          - /url: /
        - link "หนังสือ":
          - /url: /store
        - link "รายตอน":
          - /url: /serials
      - generic:
        - link "สมัครแพ็กเกจสมาชิก":
          - /url: /subscription-plans
        - link "เติมคอยน์":
          - /url: /coin-wallet
          - generic:
            - img
          - text: เติมคอยน์
  - navigation "ข้ามไปยังเมนูนำทาง" [ref=e30]:
    - list [ref=e32]:
      - listitem [ref=e33]:
        - button "หน้าแรก" [ref=e34] [cursor=pointer]
        - generic [ref=e35]: ">"
      - listitem [ref=e36]:
        - button "เข้าสู่ระบบ" [disabled] [ref=e37]
  - main [ref=e38]:
    - main [ref=e39]:
      - generic [ref=e40]:
        - img "Read and Voice Logo" [ref=e42]
        - heading "เข้าสู่ระบบ" [level=1] [ref=e43]
        - generic [ref=e44]:
          - generic [ref=e45]: อีเมล
          - textbox "อีเมล" [ref=e46]:
            - /placeholder: อีเมลของฉัน
            - text: writertest@readandvoice.com
          - generic [ref=e47]:
            - generic [ref=e48]: รหัสผ่าน
            - textbox "รหัสผ่าน" [ref=e49]: "123456789"
            - button "แสดงรหัสผ่าน" [ref=e50] [cursor=pointer]: แสดง
          - generic [ref=e51]:
            - generic [ref=e52] [cursor=pointer]:
              - checkbox "จดจำอีเมลนี้" [ref=e53]
              - generic [ref=e54]: จดจำอีเมลนี้
            - button "ลืมรหัสผ่าน" [ref=e55] [cursor=pointer]
          - button "เข้าสู่ระบบด้วยอีเมล" [ref=e56] [cursor=pointer]
        - paragraph [ref=e57]:
          - text: เมื่อคุณสมัครสมาชิกถือว่ายอมรับ
          - button "ข้อตกลงในการใช้งาน" [ref=e58] [cursor=pointer]
          - text: และ
          - button "นโยบายความเป็นส่วนตัว" [ref=e59] [cursor=pointer]
        - paragraph [ref=e60]:
          - text: ยังไม่มีบัญชี?
          - button "สมัครสมาชิก" [ref=e61] [cursor=pointer]
        - paragraph [ref=e62]: Too many authentication attempts. Please try again later.
  - contentinfo [ref=e63]:
    - generic [ref=e64]:
      - generic [ref=e65]:
        - heading "ดูเนื้อหา" [level=3] [ref=e66]
        - link "หนังสือ" [ref=e67] [cursor=pointer]:
          - /url: /store
        - link "สมัครแพ็กเกจสมาชิก" [ref=e68] [cursor=pointer]:
          - /url: /subscription-plans
        - link "รายตอน" [ref=e69] [cursor=pointer]:
          - /url: /serials
        - link "แนะนำ" [ref=e70] [cursor=pointer]:
          - /url: /recommended
      - generic [ref=e71]:
        - heading "เมนูของฉัน" [level=3] [ref=e72]
        - link "ชั้นหนังสือของฉัน" [ref=e73] [cursor=pointer]:
          - /url: /login
      - generic [ref=e74]:
        - generic [ref=e75]:
          - heading "เกี่ยวกับเรา" [level=3] [ref=e76]
          - link "ช่วยเหลือ/ติดต่อ" [ref=e77] [cursor=pointer]:
            - /url: /support
          - link "เงื่อนไขการใช้บริการ" [ref=e78] [cursor=pointer]:
            - /url: /terms
          - link "นโยบายความเป็นส่วนตัว" [ref=e79] [cursor=pointer]:
            - /url: /privacy-policy
          - link "ความเป็นส่วนตัวของข้อมูล" [ref=e80] [cursor=pointer]:
            - /url: /data-privacy
          - link "เติมคอยน์" [ref=e81] [cursor=pointer]:
            - /url: /login
        - img "Read and Voice" [ref=e83]
    - generic [ref=e84]:
      - generic [ref=e85]: © 2026 Read and Voice
      - generic [ref=e86]: อ่านอีบุ๊ก ฟังสบาย เข้าถึงหนังสือดิจิทัลได้ง่าย
  - complementary "สั่งงานด้วยเสียง":
    - button [ref=e87] [cursor=pointer]
  - generic [ref=e89]: Too many authentication attempts. Please try again later.
```

# Test source

```ts
  1   | import { expect, test, type Page } from "@playwright/test";
  2   | import fs from "node:fs";
  3   | import path from "node:path";
  4   | import { fileURLToPath } from "node:url";
  5   | 
  6   | type RoleKey = "USER" | "WRITER" | "ADMIN" | "SUPERADMIN";
  7   | 
  8   | const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  9   | 
  10  | function loadEnvFile(filePath: string) {
  11  |   if (!fs.existsSync(filePath)) return;
  12  | 
  13  |   for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
  14  |     const trimmed = line.trim();
  15  |     if (!trimmed || trimmed.startsWith("#")) continue;
  16  |     const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
  17  |     if (!match) continue;
  18  | 
  19  |     const [, key, rawValue] = match;
  20  |     if (process.env[key]) continue;
  21  |     process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  22  |   }
  23  | }
  24  | 
  25  | loadEnvFile(path.join(rootDir, ".env"));
  26  | loadEnvFile(path.join(rootDir, "backend", ".env"));
  27  | 
  28  | function credentials(role: RoleKey) {
  29  |   const email = process.env[`SMOKE_${role}_EMAIL`];
  30  |   const password = process.env[`SMOKE_${role}_PASSWORD`];
  31  |   if (!email || !password) {
  32  |     throw new Error(`Missing SMOKE_${role}_EMAIL or SMOKE_${role}_PASSWORD`);
  33  |   }
  34  |   return { email, password };
  35  | }
  36  | 
  37  | async function expectAppReady(page: Page) {
  38  |   await expect(page.locator("#app")).toBeVisible();
  39  |   await page.waitForLoadState("domcontentloaded").catch(() => {});
  40  |   await expect(page.locator("body")).not.toContainText("Cannot GET");
  41  | }
  42  | 
  43  | async function clickFirstVisible(page: Page, selector: string) {
  44  |   const locator = page.locator(selector).locator("visible=true").first();
  45  |   await expect(locator).toBeVisible();
  46  |   const href = await locator.getAttribute("href");
  47  |   if (href?.startsWith("/")) {
  48  |     await page.goto(href);
  49  |   } else {
  50  |     await locator.click({ timeout: 2000 });
  51  |   }
  52  |   await expectAppReady(page);
  53  | }
  54  | 
  55  | async function loginAs(page: Page, role: RoleKey) {
  56  |   const { email, password } = credentials(role);
  57  |   await page.goto("/login");
  58  |   await expectAppReady(page);
  59  |   await page.locator('input[type="email"]').fill(email);
  60  |   await page.locator('input[type="password"], input[type="text"]').last().fill(password);
  61  |   await page.locator('button[type="submit"]').click();
> 62  |   await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });
      |              ^ TimeoutError: page.waitForURL: Timeout 20000ms exceeded.
  63  |   await expectAppReady(page);
  64  | }
  65  | 
  66  | async function clickSafeButtons(page: Page, limit = 3) {
  67  |   page.on("dialog", async (dialog) => {
  68  |     await dialog.dismiss().catch(() => {});
  69  |   });
  70  | 
  71  |   const unsafe = /delete|remove|logout|ออกจากระบบ|ลบ|ซื้อ|ชำระ|เติม|อนุมัติ|ปฏิเสธ|บันทึก|submit|pay|purchase|confirm|line|voice|อ่านออกเสียง|ไมค์/i;
  72  |   const buttons = page.locator("button:visible");
  73  |   const count = await buttons.count();
  74  |   let clicked = 0;
  75  | 
  76  |   for (let index = 0; index < count && clicked < limit; index += 1) {
  77  |     const button = buttons.nth(index);
  78  |     if (!(await button.isVisible().catch(() => false))) continue;
  79  |     if (await button.isDisabled().catch(() => true)) continue;
  80  | 
  81  |     const label = `${await button.innerText().catch(() => "")} ${await button.getAttribute("aria-label").catch(() => "")}`;
  82  |     if (unsafe.test(label)) continue;
  83  | 
  84  |     await button.click({ timeout: 1000 }).catch(() => {});
  85  |     if (page.isClosed()) return;
  86  |     await page.waitForTimeout(100);
  87  |     clicked += 1;
  88  |   }
  89  | }
  90  | 
  91  | test("public navigation and login controls work", async ({ page }) => {
  92  |   await page.goto("/");
  93  |   await expectAppReady(page);
  94  | 
  95  |   for (const route of ["/store", "/serials", "/categories", "/tags"]) {
  96  |     await page.goto(route);
  97  |     await expectAppReady(page);
  98  |   }
  99  | 
  100 |   await page.goto("/search");
  101 |   await expectAppReady(page);
  102 |   const searchInput = page.locator('input[type="search"], input[placeholder], input[type="text"]').first();
  103 |   if (await searchInput.isVisible().catch(() => false)) {
  104 |     await searchInput.fill("voice");
  105 |     await searchInput.press("Enter").catch(() => {});
  106 |     await expectAppReady(page);
  107 |   }
  108 | 
  109 |   await page.goto("/login");
  110 |   await expectAppReady(page);
  111 |   await clickSafeButtons(page, 5);
  112 |   await page.locator('button[type="submit"]').click();
  113 |   await expect(page.locator("#login-status")).toBeVisible();
  114 | });
  115 | 
  116 | test("reader account pages and important buttons work", async ({ page }) => {
  117 |   await loginAs(page, "USER");
  118 | 
  119 |   for (const route of ["/profile", "/my-library", "/cart", "/coin-wallet", "/account/following"]) {
  120 |     await page.goto(route);
  121 |     await expectAppReady(page);
  122 |     await clickSafeButtons(page, 6);
  123 |   }
  124 | 
  125 |   await page.goto("/account/notifications");
  126 |   await expectAppReady(page);
  127 |   const markAll = page.locator("button:visible").first();
  128 |   if (await markAll.isEnabled().catch(() => false)) {
  129 |     await markAll.click();
  130 |     await expectAppReady(page);
  131 |   }
  132 | 
  133 |   await page.goto("/account/devices");
  134 |   await expectAppReady(page);
  135 |   await clickSafeButtons(page, 4);
  136 | });
  137 | 
  138 | test("writer pages render and non-destructive controls respond", async ({ page }) => {
  139 |   await loginAs(page, "WRITER");
  140 | 
  141 |   for (const route of ["/writer", "/writer/books", "/writer/stats", "/writer/profile", "/writer/upload"]) {
  142 |     await page.goto(route);
  143 |     await expectAppReady(page);
  144 |     await clickSafeButtons(page, 8);
  145 |   }
  146 | });
  147 | 
  148 | test("admin and superadmin pages render with seeded operational data", async ({ page }) => {
  149 |   await loginAs(page, "ADMIN");
  150 | 
  151 |   for (const route of ["/admin", "/admin/page-content", "/admin/categories", "/admin/payments", "/admin/support-tickets", "/admin/password-resets"]) {
  152 |     await page.goto(route);
  153 |     await expectAppReady(page);
  154 |     await clickSafeButtons(page, 2);
  155 |   }
  156 | 
  157 |   await page.evaluate(() => {
  158 |     localStorage.clear();
  159 |     sessionStorage.clear();
  160 |   });
  161 | 
  162 |   await loginAs(page, "SUPERADMIN");
```