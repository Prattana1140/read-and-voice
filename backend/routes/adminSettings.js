const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { requireSuperAdmin } = require("../middleware/superadmin");
const { getProductionReadiness } = require("../services/readiness");
const { DEFAULT_SYSTEM_SETTINGS } = require("../services/systemSettings");

const router = express.Router();

const DEFAULT_CHECKLIST = {
  rolesReviewed: false,
  approvalsChecked: false,
  pageContentReviewed: false,
  catalogReviewed: false,
};

let tablesReady;

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function isPlaceholder(value) {
  const text = String(value || "").trim().toLowerCase();
  return (
    !text ||
    text.includes("change-this") ||
    text.includes("replace-with") ||
    text.includes("your-") ||
    text.includes("example") ||
    ["x", "xx", "xxx", "xxxx", "xxxxx"].includes(text)
  );
}

function isTruthyEnv(value) {
  return /^(1|true|yes)$/i.test(String(value || "").trim());
}

function getOAuthRedirectUri(provider) {
  const providerKey = String(provider || "").toUpperCase();
  return (
    readEnv(`${providerKey}_REDIRECT_URI`) ||
    readEnv("OAUTH_REDIRECT_URI") ||
    `${readEnv("API_PUBLIC_URL") || readEnv("RENDER_EXTERNAL_URL") || "http://localhost:3000"}/api/auth/oauth/${provider}/callback`
  );
}

async function countQuery(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return Number(rows[0]?.total || 0);
}

function getLatestBackup() {
  const backupDir =
    process.env.DB_BACKUP_DIR ||
    path.join(__dirname, "..", "backups", "manual");

  if (!fs.existsSync(backupDir)) {
    return {
      configured: false,
      directory: backupDir,
      latest_file: null,
      latest_at: null,
      latest_bytes: 0,
    };
  }

  const files = fs
    .readdirSync(backupDir)
    .filter((file) => file.toLowerCase().endsWith(".sql"))
    .map((file) => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      return {
        file,
        path: filePath,
        mtime: stats.mtime,
        bytes: stats.size,
      };
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  const latest = files[0] || null;
  return {
    configured: true,
    directory: backupDir,
    latest_file: latest?.file || null,
    latest_at: latest?.mtime?.toISOString() || null,
    latest_bytes: latest?.bytes || 0,
  };
}

async function ensureTables() {
  if (!tablesReady) {
    tablesReady = db
      .query(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          setting_key VARCHAR(120) PRIMARY KEY,
          setting_json LONGTEXT NULL,
          updated_by INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_admin_settings_updated_by (updated_by),
          CONSTRAINT fk_admin_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `)
      .then(() => true);
  }

  return tablesReady;
}

function safeParseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

router.use(verifyToken, requireSuperAdmin);

router.get("/checklist", async (_req, res) => {
  try {
    await ensureTables();
    const [rows] = await db.query(
      `SELECT setting_json, updated_by, updated_at
       FROM admin_settings
       WHERE setting_key = 'superadmin_checklist'
       LIMIT 1`,
    );

    const row = rows[0] || {};
    return res.json({
      checklist: {
        ...DEFAULT_CHECKLIST,
        ...safeParseJson(row.setting_json, {}),
      },
      updated_by: row.updated_by || null,
      updated_at: row.updated_at || null,
    });
  } catch (error) {
    console.error("GET /admin/settings/checklist error:", error);
    return res.status(500).json({ message: "โหลด checklist ระบบไม่สำเร็จ" });
  }
});

router.get("/readiness", async (_req, res) => {
  return res.json(getProductionReadiness());
});

router.get("/operations", async (_req, res) => {
  try {
    const lineClientId = readEnv("LINE_CLIENT_ID");
    const lineClientSecret = readEnv("LINE_CLIENT_SECRET");
    const lineReady = !isPlaceholder(lineClientId) && !isPlaceholder(lineClientSecret);
    const resendReady = !isPlaceholder(readEnv("RESEND_API_KEY")) && !isPlaceholder(readEnv("EMAIL_FROM"));
    const webhookReady =
      !isPlaceholder(readEnv("PASSWORD_RESET_EMAIL_WEBHOOK_URL")) ||
      !isPlaceholder(readEnv("EMAIL_WEBHOOK_URL"));
    const previewEnabled = isTruthyEnv(readEnv("ALLOW_PASSWORD_RESET_PREVIEW"));
    const adminFallbackEnabled = !isTruthyEnv(readEnv("DISABLE_ADMIN_PASSWORD_RESET"));

    const totalBooks = await countQuery("SELECT COUNT(*) AS total FROM books");
    const missingStructuredContent = await countQuery(
      `SELECT COUNT(*) AS total
       FROM books b
       WHERE b.full_text IS NOT NULL
         AND TRIM(b.full_text) <> ''
         AND NOT EXISTS (
           SELECT 1 FROM book_units bu WHERE bu.book_id = b.id
         )`,
    ).catch(() => 0);
    const pendingApprovals = await countQuery(
      `SELECT COUNT(*) AS total
       FROM books
       WHERE approval_status = 'pending' OR lifecycle_status = 'pending_review'`,
    ).catch(() => 0);
    const pendingTopups = await countQuery(
      `SELECT COUNT(*) AS total
       FROM coin_topup_orders
       WHERE status = 'pending'`,
    ).catch(() => 0);
    const openSupportTickets = await countQuery(
      `SELECT COUNT(*) AS total
       FROM support_tickets
       WHERE status IN ('open', 'new', 'pending')`,
    ).catch(() => 0);

    const backup = getLatestBackup();
    const latestBackupAgeHours = backup.latest_at
      ? Math.round((Date.now() - new Date(backup.latest_at).getTime()) / 36e5)
      : null;

    return res.json({
      checked_at: new Date().toISOString(),
      social_login: {
        line: {
          configured: lineReady,
          client_id_set: !isPlaceholder(lineClientId),
          client_secret_set: !isPlaceholder(lineClientSecret),
          callback_url: getOAuthRedirectUri("line"),
        },
      },
      password_reset: {
        configured: resendReady || webhookReady,
        provider: resendReady ? "resend" : webhookReady ? "webhook" : null,
        email_from_set: !isPlaceholder(readEnv("EMAIL_FROM")),
        preview_enabled: previewEnabled,
        admin_fallback_enabled: adminFallbackEnabled,
      },
      content: {
        total_books: totalBooks,
        missing_structured_content: missingStructuredContent,
        content_audit_command: "npm --prefix backend run content:audit",
      },
      queues: {
        pending_book_approvals: pendingApprovals,
        pending_coin_topups: pendingTopups,
        open_support_tickets: openSupportTickets,
      },
      monitoring: {
        command: "npm --prefix backend run monitor:check",
        daily_command: "npm --prefix backend run ops:daily",
      },
      backup: {
        ...backup,
        latest_age_hours: latestBackupAgeHours,
        command: "npm --prefix backend run db:backup",
        retention_days: Number(process.env.DB_BACKUP_RETENTION_DAYS || 14),
      },
    });
  } catch (error) {
    console.error("GET /admin/settings/operations error:", error);
    return res.status(500).json({ message: "โหลดสถานะ operational ไม่สำเร็จ" });
  }
});

router.get("/system", async (_req, res) => {
  try {
    await ensureTables();
    const [rows] = await db.query(
      `SELECT setting_json, updated_by, updated_at
       FROM admin_settings
       WHERE setting_key = 'system_settings'
       LIMIT 1`,
    );

    const row = rows[0] || {};
    return res.json({
      settings: {
        ...DEFAULT_SYSTEM_SETTINGS,
        ...safeParseJson(row.setting_json, {}),
      },
      updated_by: row.updated_by || null,
      updated_at: row.updated_at || null,
    });
  } catch (error) {
    console.error("GET /admin/settings/system error:", error);
    return res.status(500).json({ message: "โหลดการตั้งค่าระบบไม่สำเร็จ" });
  }
});

router.put("/checklist", async (req, res) => {
  try {
    await ensureTables();
    const incoming = req.body?.checklist || req.body || {};
    const checklist = {
      ...DEFAULT_CHECKLIST,
      ...(incoming && typeof incoming === "object" ? incoming : {}),
    };

    await db.query(
      `INSERT INTO admin_settings (setting_key, setting_json, updated_by)
       VALUES ('superadmin_checklist', ?, ?)
       ON DUPLICATE KEY UPDATE
         setting_json = VALUES(setting_json),
         updated_by = VALUES(updated_by),
         updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(checklist), req.user.id],
    );

    return res.json({ message: "บันทึก checklist ระบบแล้ว", checklist });
  } catch (error) {
    console.error("PUT /admin/settings/checklist error:", error);
    return res.status(500).json({ message: "บันทึก checklist ระบบไม่สำเร็จ" });
  }
});

router.put("/system", async (req, res) => {
  try {
    await ensureTables();
    const incoming = req.body?.settings || req.body || {};
    const settings = {
      ...DEFAULT_SYSTEM_SETTINGS,
      ...(incoming && typeof incoming === "object" ? incoming : {}),
    };

    settings.registration_enabled = Boolean(settings.registration_enabled);
    settings.writer_applications_enabled = Boolean(settings.writer_applications_enabled);
    settings.manual_payment_enabled = Boolean(settings.manual_payment_enabled);
    settings.support_form_enabled = Boolean(settings.support_form_enabled);
    settings.admin_password_reset_enabled = Boolean(settings.admin_password_reset_enabled);
    settings.maintenance_notice = String(settings.maintenance_notice || "").slice(0, 1000);
    settings.support_email = String(settings.support_email || "").slice(0, 255);
    settings.updated_note = String(settings.updated_note || "").slice(0, 1000);

    await db.query(
      `INSERT INTO admin_settings (setting_key, setting_json, updated_by)
       VALUES ('system_settings', ?, ?)
       ON DUPLICATE KEY UPDATE
         setting_json = VALUES(setting_json),
         updated_by = VALUES(updated_by),
         updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(settings), req.user.id],
    );

    return res.json({ message: "บันทึกการตั้งค่าระบบแล้ว", settings });
  } catch (error) {
    console.error("PUT /admin/settings/system error:", error);
    return res.status(500).json({ message: "บันทึกการตั้งค่าระบบไม่สำเร็จ" });
  }
});

module.exports = router;
