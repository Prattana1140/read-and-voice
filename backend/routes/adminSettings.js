const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { requireSuperAdmin } = require("../middleware/superadmin");
const { getProductionReadiness } = require("../services/readiness");

const router = express.Router();

const DEFAULT_CHECKLIST = {
  rolesReviewed: false,
  approvalsChecked: false,
  pageContentReviewed: false,
  catalogReviewed: false,
};

let tablesReady;

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

module.exports = router;
