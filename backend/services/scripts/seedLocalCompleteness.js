require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env"), quiet: true });
require("dotenv").config({ quiet: true });

const db = require("../../config/db");
const { DEFAULT_SYSTEM_SETTINGS } = require("../systemSettings");
const { ensureNotificationTables, createNotification } = require("../notifications");

const checklist = {
  rolesReviewed: true,
  approvalsChecked: true,
  pageContentReviewed: true,
  catalogReviewed: true,
};

const systemSettings = {
  ...DEFAULT_SYSTEM_SETTINGS,
  registration_enabled: true,
  writer_applications_enabled: true,
  manual_payment_enabled: true,
  support_form_enabled: true,
  admin_password_reset_enabled: true,
  support_email: process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || "support@readandvoice.local",
  updated_note: "Seeded for complete local review.",
};

async function ensureSupportTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      name VARCHAR(255) NULL,
      email VARCHAR(255) NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'general',
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      path VARCHAR(500) NULL,
      page_url VARCHAR(500) NULL,
      steps_to_reproduce TEXT NULL,
      expected_result TEXT NULL,
      actual_result TEXT NULL,
      attachment_url VARCHAR(500) NULL,
      browser_info VARCHAR(500) NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'open',
      source VARCHAR(50) NOT NULL DEFAULT 'support_form',
      admin_note TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_support_tickets_user (user_id),
      INDEX idx_support_tickets_status (status),
      CONSTRAINT fk_support_tickets_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await Promise.all([
    ensureSupportColumn("category", "VARCHAR(50) NOT NULL DEFAULT 'general' AFTER email"),
    ensureSupportColumn("path", "VARCHAR(500) NULL AFTER message"),
    ensureSupportColumn("page_url", "VARCHAR(500) NULL AFTER path"),
    ensureSupportColumn("steps_to_reproduce", "TEXT NULL AFTER page_url"),
    ensureSupportColumn("expected_result", "TEXT NULL AFTER steps_to_reproduce"),
    ensureSupportColumn("actual_result", "TEXT NULL AFTER expected_result"),
    ensureSupportColumn("attachment_url", "VARCHAR(500) NULL AFTER actual_result"),
    ensureSupportColumn("browser_info", "VARCHAR(500) NULL AFTER attachment_url"),
  ]);
}

async function ensureSupportColumn(columnName, definition) {
  try {
    await db.query(`ALTER TABLE support_tickets ADD COLUMN ${columnName} ${definition}`);
  } catch (error) {
    if (error?.code !== "ER_DUP_FIELDNAME") {
      throw error;
    }
  }
}

async function ensureAdminSettingsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      setting_key VARCHAR(120) PRIMARY KEY,
      setting_json LONGTEXT NULL,
      updated_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_admin_settings_updated_by (updated_by),
      CONSTRAINT fk_admin_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
}

async function getSeedUser() {
  const email = process.env.SMOKE_USER_EMAIL || "usertest@readandvoice.com";
  const [rows] = await db.query(
    `SELECT id, name, email
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email],
  );
  if (rows[0]) return rows[0];

  const [fallbackRows] = await db.query(
    `SELECT id, name, email
     FROM users
     WHERE role IN ('user', 'reader')
     ORDER BY id ASC
     LIMIT 1`,
  );
  return fallbackRows[0] || null;
}

async function getPublishedBook() {
  const [rows] = await db.query(
    `SELECT id, title
     FROM books
     WHERE COALESCE(is_published, 1) = 1
     ORDER BY id DESC
     LIMIT 1`,
  );
  return rows[0] || null;
}

async function seedAdminSettings() {
  await ensureAdminSettingsTable();
  const entries = [
    ["superadmin_checklist", checklist],
    ["system_settings", systemSettings],
  ];

  for (const [key, value] of entries) {
    await db.query(
      `INSERT INTO admin_settings (setting_key, setting_json)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
         setting_json = VALUES(setting_json),
         updated_at = CURRENT_TIMESTAMP`,
      [key, JSON.stringify(value)],
    );
  }
}

async function insertSupportTicketIfMissing(ticket) {
  const [rows] = await db.query(
    `SELECT id
     FROM support_tickets
     WHERE subject = ? AND email = ?
     LIMIT 1`,
    [ticket.subject, ticket.email],
  );
  if (rows.length) return false;

  await db.query(
    `INSERT INTO support_tickets
       (user_id, name, email, category, subject, message, path, page_url,
        steps_to_reproduce, expected_result, actual_result, status, source, admin_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_seed', ?)`,
    [
      ticket.user_id,
      ticket.name,
      ticket.email,
      ticket.category || "general",
      ticket.subject,
      ticket.message,
      ticket.path || "/support",
      ticket.page_url || "",
      ticket.steps_to_reproduce || "",
      ticket.expected_result || "",
      ticket.actual_result || "",
      ticket.status,
      ticket.admin_note || null,
    ],
  );
  return true;
}

async function seedSupportTickets(user, book) {
  await ensureSupportTables();
  const displayName = user?.name || "Local Reader";
  const email = user?.email || "reader@readandvoice.local";
  const title = book?.title || "หนังสือตัวอย่าง";

  await insertSupportTicketIfMissing({
    user_id: user?.id || null,
    name: displayName,
    email,
    subject: "ตรวจสอบเสียงอ่านของหนังสือ",
    message: `ผู้ใช้แจ้งว่าอยากให้ตรวจเสียงอ่านของเรื่อง ${title} ในโหมด local completeness.`,
    category: "book",
    path: "/support",
    page_url: "/reader",
    steps_to_reproduce: `1. เปิดหนังสือ ${title}\n2. กดเล่นเสียงอ่าน\n3. ฟังเสียงอ่านในตอนตัวอย่าง`,
    expected_result: "เสียงอ่านควรเล่นต่อเนื่องและตรงกับข้อความ",
    actual_result: "ผู้ใช้รู้สึกว่าเสียงอ่านบางช่วงไม่ต่อเนื่อง",
    status: "open",
  });
  await insertSupportTicketIfMissing({
    user_id: user?.id || null,
    name: displayName,
    email,
    subject: "สอบถามสถานะเติมเหรียญ",
    message: "ตัวอย่าง ticket สำหรับให้หน้า admin support มีข้อมูลตรวจสอบและอัปเดตสถานะได้.",
    category: "payment",
    path: "/contact",
    page_url: "/wallet",
    steps_to_reproduce: "1. เปิดกระเป๋าเหรียญ\n2. ตรวจสอบยอดหลังแจ้งโอน",
    expected_result: "ยอดเหรียญควรอัปเดตหลังแอดมินอนุมัติ",
    actual_result: "ผู้ใช้ต้องการให้แอดมินช่วยตรวจสอบสถานะ",
    status: "in_progress",
    admin_note: "กำลังตรวจสอบรายการตัวอย่างในระบบ local.",
  });
}

async function notificationExists(userId, type, title) {
  const [rows] = await db.query(
    `SELECT id
     FROM user_notifications
     WHERE user_id = ? AND type = ? AND title = ?
     LIMIT 1`,
    [userId, type, title],
  );
  return rows.length > 0;
}

async function createNotificationIfMissing(payload) {
  if (await notificationExists(payload.userId, payload.type, payload.title)) return false;
  await createNotification(payload);
  return true;
}

async function seedNotifications(user, book) {
  if (!user?.id) return;
  await ensureNotificationTables();
  await db.query(
    `INSERT INTO user_notification_settings
       (user_id, writers, series, promotions, \`system\`)
     VALUES (?, 1, 1, 1, 1)
     ON DUPLICATE KEY UPDATE
       promotions = VALUES(promotions),
       updated_at = CURRENT_TIMESTAMP`,
    [user.id],
  );

  await createNotificationIfMissing({
    userId: user.id,
    type: "system_welcome",
    title: "ยินดีต้อนรับสู่ Read and Voice",
    message: "นี่คือการแจ้งเตือนตัวอย่างสำหรับตรวจหน้าศูนย์แจ้งเตือนในเครื่อง.",
    actionUrl: "/profile",
    metadata: { source: "local_completeness_seed" },
  });
  await createNotificationIfMissing({
    userId: user.id,
    type: "writer_new_episode",
    title: "มีตอนใหม่พร้อมอ่าน",
    message: `${book?.title || "หนังสือตัวอย่าง"} มีเนื้อหาใหม่สำหรับตรวจ flow การอ่าน.`,
    actionUrl: book?.id ? `/reader/${book.id}` : "/my-library",
    metadata: { source: "local_completeness_seed", book_id: book?.id || null },
  });
  await createNotificationIfMissing({
    userId: user.id,
    type: "promotion_offer",
    title: "แพ็กเกจสมาชิกพร้อมตรวจสอบ",
    message: "ใช้รายการนี้ตรวจหน้าการแจ้งเตือนและลิงก์ไปยังแพ็กเกจสมาชิก.",
    actionUrl: "/subscription-plans",
    metadata: { source: "local_completeness_seed" },
  });
}

async function printCounts() {
  const [rows] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM admin_settings) AS admin_settings,
      (SELECT COUNT(*) FROM support_tickets) AS support_tickets,
      (SELECT COUNT(*) FROM user_notifications) AS user_notifications
  `);
  console.log("Local completeness seed counts:", rows[0]);
}

async function main() {
  const user = await getSeedUser();
  const book = await getPublishedBook();

  await seedAdminSettings();
  await seedSupportTickets(user, book);
  await seedNotifications(user, book);
  await printCounts();
  await db.end();
}

main().catch(async (error) => {
  console.error("Local completeness seed failed:", error);
  await db.end().catch(() => {});
  process.exitCode = 1;
});
