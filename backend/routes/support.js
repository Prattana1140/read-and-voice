const express = require("express");
const db = require("../config/db");
const { optionalVerifyToken, verifyToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const { isSystemFeatureEnabled } = require("../services/systemSettings");

const router = express.Router();

let supportTablesReady;

function cleanText(value, maxLength = 1000) {
  const text = String(value || "").trim();
  return text ? text.slice(0, maxLength) : "";
}

async function ensureSupportTables() {
  if (!supportTablesReady) {
    supportTablesReady = db
      .query(`
        CREATE TABLE IF NOT EXISTS support_tickets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NULL,
          name VARCHAR(255) NULL,
          email VARCHAR(255) NULL,
          subject VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
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
      `)
      .then(() => true);
  }

  return supportTablesReady;
}

router.post("/tickets", optionalVerifyToken, async (req, res) => {
  try {
    if (!(await isSystemFeatureEnabled("support_form_enabled", true))) {
      return res.status(503).json({ message: "ระบบรับคำขอช่วยเหลือปิดใช้งานชั่วคราว" });
    }

    await ensureSupportTables();

    const name = cleanText(req.body.name || req.body.full_name || req.body.display_name, 255);
    const email = cleanText(req.body.email || req.body.contact_email, 255);
    const subject =
      cleanText(req.body.subject || req.body.title || req.body.topic, 255) ||
      "Support request";
    const message = cleanText(
      req.body.message || req.body.detail || req.body.description || req.body.body,
      4000,
    );

    if (!message) {
      return res.status(400).json({ message: "กรุณาระบุรายละเอียดปัญหา" });
    }

    if (!req.user && !email) {
      return res.status(400).json({ message: "กรุณาระบุอีเมลสำหรับติดต่อกลับ" });
    }

    const [result] = await db.query(
      `INSERT INTO support_tickets
         (user_id, name, email, subject, message, source)
       VALUES (?, ?, ?, ?, ?, 'support_form')`,
      [
        req.user?.id || null,
        name || req.user?.name || null,
        email || req.user?.email || null,
        subject,
        message,
      ],
    );

    return res.status(201).json({
      message: "ส่งคำขอช่วยเหลือเรียบร้อยแล้ว",
      ticket_id: result.insertId,
    });
  } catch (error) {
    console.error("POST /support/tickets error:", error);
    return res.status(500).json({ message: "ส่งคำขอช่วยเหลือไม่สำเร็จ" });
  }
});

router.get("/tickets", verifyToken, requireAdmin, async (req, res) => {
  try {
    await ensureSupportTables();

    const status = cleanText(req.query.status, 30).toLowerCase();
    const params = [];
    let where = "";

    if (status && status !== "all") {
      where = "WHERE status = ?";
      params.push(status);
    }

    const [rows] = await db.query(
      `SELECT id, user_id, name, email, subject, message, status, source, admin_note, created_at, updated_at
       FROM support_tickets
       ${where}
       ORDER BY created_at DESC
       LIMIT 100`,
      params,
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error("GET /support/tickets error:", error);
    return res.status(500).json({ message: "โหลดคำขอช่วยเหลือไม่สำเร็จ" });
  }
});

router.patch("/tickets/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    await ensureSupportTables();

    const ticketId = Number(req.params.id);
    const status = cleanText(req.body.status, 30).toLowerCase();
    const note = cleanText(req.body.admin_note || req.body.note, 2000) || null;
    const allowedStatuses = ["open", "in_progress", "resolved", "closed"];

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(400).json({ message: "รหัสคำขอไม่ถูกต้อง" });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "สถานะคำขอไม่ถูกต้อง" });
    }

    await db.query(
      `UPDATE support_tickets
       SET status = ?,
           admin_note = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [status, note, ticketId],
    );

    return res.json({ message: "อัปเดตคำขอช่วยเหลือแล้ว" });
  } catch (error) {
    console.error("PATCH /support/tickets/:id error:", error);
    return res.status(500).json({ message: "อัปเดตคำขอช่วยเหลือไม่สำเร็จ" });
  }
});

module.exports = router;
