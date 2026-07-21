const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const db = require("../config/db");
const { optionalVerifyToken, verifyToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const { isSystemFeatureEnabled } = require("../services/systemSettings");

const router = express.Router();
const attachmentDir = path.join(__dirname, "../uploads/support-attachments");

fs.mkdirSync(attachmentDir, { recursive: true });

const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, attachmentDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
      cb(null, `support-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype || "")) {
      cb(null, true);
      return;
    }
    cb(new Error("รองรับเฉพาะไฟล์รูปภาพ PNG, JPG, WEBP หรือ GIF"));
  },
});

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
      `)
      .then(() =>
        Promise.all([
          ensureColumn("category", "VARCHAR(50) NOT NULL DEFAULT 'general' AFTER email"),
          ensureColumn("path", "VARCHAR(500) NULL AFTER message"),
          ensureColumn("page_url", "VARCHAR(500) NULL AFTER path"),
          ensureColumn("steps_to_reproduce", "TEXT NULL AFTER page_url"),
          ensureColumn("expected_result", "TEXT NULL AFTER steps_to_reproduce"),
          ensureColumn("actual_result", "TEXT NULL AFTER expected_result"),
          ensureColumn("attachment_url", "VARCHAR(500) NULL AFTER actual_result"),
          ensureColumn("browser_info", "VARCHAR(500) NULL AFTER attachment_url"),
        ]),
      )
      .then(() => true);
  }

  return supportTablesReady;
}

async function ensureColumn(columnName, definition) {
  try {
    await db.query(`ALTER TABLE support_tickets ADD COLUMN ${columnName} ${definition}`);
  } catch (error) {
    if (error?.code !== "ER_DUP_FIELDNAME") {
      throw error;
    }
  }
}

function uploadAttachment(req, res, next) {
  attachmentUpload.single("attachment")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    const message =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "รูปภาพแนบต้องมีขนาดไม่เกิน 5MB"
        : error.message || "อัปโหลดรูปภาพแนบไม่สำเร็จ";
    res.status(400).json({ message });
  });
}

router.post("/tickets", optionalVerifyToken, uploadAttachment, async (req, res) => {
  try {
    if (!(await isSystemFeatureEnabled("support_form_enabled", true))) {
      return res.status(503).json({ message: "ระบบรับคำขอช่วยเหลือปิดใช้งานชั่วคราว" });
    }

    await ensureSupportTables();

    const name = cleanText(req.body.name || req.body.full_name || req.body.display_name, 255);
    const email = cleanText(req.body.email || req.body.contact_email, 255);
    const category = cleanText(req.body.category, 50) || "general";
    const subject =
      cleanText(req.body.subject || req.body.title || req.body.topic, 255) ||
      "Support request";
    const message = cleanText(
      req.body.message || req.body.detail || req.body.description || req.body.body,
      4000,
    );
    const pathValue = cleanText(req.body.path, 500);
    const pageUrl = cleanText(req.body.page_url || req.body.pageUrl, 500);
    const stepsToReproduce = cleanText(req.body.steps_to_reproduce || req.body.stepsToReproduce, 4000);
    const expectedResult = cleanText(req.body.expected_result || req.body.expectedResult, 2000);
    const actualResult = cleanText(req.body.actual_result || req.body.actualResult, 2000);
    const browserInfo = cleanText(req.body.browser_info || req.body.browserInfo, 500);
    const attachmentUrl = req.file ? `/uploads/support-attachments/${req.file.filename}` : null;

    if (!message) {
      return res.status(400).json({ message: "กรุณาระบุรายละเอียดปัญหา" });
    }

    if (!req.user && !email) {
      return res.status(400).json({ message: "กรุณาระบุอีเมลสำหรับติดต่อกลับ" });
    }

    const [result] = await db.query(
      `INSERT INTO support_tickets
         (user_id, name, email, category, subject, message, path, page_url,
          steps_to_reproduce, expected_result, actual_result, attachment_url, browser_info, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'support_form')`,
      [
        req.user?.id || null,
        name || req.user?.name || null,
        email || req.user?.email || null,
        category,
        subject,
        message,
        pathValue || null,
        pageUrl || null,
        stepsToReproduce || null,
        expectedResult || null,
        actualResult || null,
        attachmentUrl,
        browserInfo || null,
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
      `SELECT id, user_id, name, email, category, subject, message, path, page_url,
              steps_to_reproduce, expected_result, actual_result, attachment_url, browser_info,
              status, source, admin_note, created_at, updated_at, updated_at AS handled_at
       FROM support_tickets
       ${where}
       ORDER BY created_at DESC
       LIMIT 100`,
      params,
    );

    const [summaryRows] = await db.query(
      `SELECT status, COUNT(*) AS count
       FROM support_tickets
       GROUP BY status`,
    );
    const summary = {
      total: 0,
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    };
    summaryRows.forEach((row) => {
      const key = String(row.status || "").toLowerCase();
      const count = Number(row.count || 0);
      if (Object.prototype.hasOwnProperty.call(summary, key)) {
        summary[key] = count;
      }
      summary.total += count;
    });

    return res.json({ items: rows, summary });
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
