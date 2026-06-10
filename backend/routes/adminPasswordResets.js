const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = express.Router();

function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || "http://localhost:5173";
}

function createTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(10);
  let password = "Rv-";

  for (const byte of bytes) {
    password += alphabet[byte % alphabet.length];
  }

  return password;
}

async function ensurePasswordResetTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_password_reset_tokens_user (user_id),
      UNIQUE KEY uq_password_reset_tokens_hash (token_hash),
      CONSTRAINT fk_admin_password_reset_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      email VARCHAR(255) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      delivery_method VARCHAR(40) NULL,
      admin_note TEXT NULL,
      requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      handled_at DATETIME NULL,
      handled_by INT NULL,
      INDEX idx_password_reset_requests_status (status),
      INDEX idx_password_reset_requests_user (user_id),
      CONSTRAINT fk_admin_password_reset_requests_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_admin_password_reset_requests_handler
        FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);
}

router.get("/password-resets", verifyToken, requireAdmin, async (req, res) => {
  try {
    await ensurePasswordResetTables();

    const status = String(req.query.status || "pending").trim().toLowerCase();
    const params = [];
    let where = "";

    if (status && status !== "all") {
      where = "WHERE r.status = ?";
      params.push(status);
    }

    const [rows] = await db.query(
      `SELECT
         r.id,
         r.user_id,
         r.email,
         r.status,
         r.delivery_method,
         r.admin_note,
         r.requested_at,
         r.handled_at,
         r.handled_by,
         u.name,
         u.role,
         u.status AS user_status,
         handler.name AS handled_by_name
       FROM password_reset_requests r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN users handler ON handler.id = r.handled_by
       ${where}
       ORDER BY r.requested_at DESC
       LIMIT 100`,
      params,
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error("GET /admin/password-resets error:", error);
    return res.status(500).json({ message: "โหลดคำขอรีเซ็ตรหัสผ่านไม่สำเร็จ" });
  }
});

router.post("/password-resets/:id/link", verifyToken, requireAdmin, async (req, res) => {
  try {
    await ensurePasswordResetTables();

    const requestId = Number(req.params.id);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: "รหัสคำขอไม่ถูกต้อง" });
    }

    const [requests] = await db.query(
      `SELECT r.id, r.user_id, r.email, u.status AS user_status
       FROM password_reset_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.id = ?
       LIMIT 1`,
      [requestId],
    );

    const request = requests[0];
    if (!request) {
      return res.status(404).json({ message: "ไม่พบคำขอรีเซ็ตรหัสผ่าน" });
    }

    if (request.user_status && request.user_status !== "active") {
      return res.status(400).json({ message: "บัญชีนี้ไม่พร้อมใช้งาน" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = ?
         AND used_at IS NULL`,
      [request.user_id],
    );

    await db.query(
      `INSERT INTO password_reset_tokens
         (user_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, NOW())`,
      [request.user_id, tokenHash, expiresAt],
    );

    await db.query(
      `UPDATE password_reset_requests
       SET status = 'link_created',
           handled_at = NOW(),
           handled_by = ?,
           admin_note = ?
       WHERE id = ?`,
      [
        req.user.id,
        String(req.body.note || "Admin created reset link").slice(0, 1000),
        requestId,
      ],
    );

    return res.json({
      message: "สร้างลิงก์รีเซ็ตรหัสผ่านแล้ว",
      reset_url: `${getFrontendUrl()}/forgot-password?token=${resetToken}`,
      expires_at: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("POST /admin/password-resets/:id/link error:", error);
    return res.status(500).json({ message: "สร้างลิงก์รีเซ็ตรหัสผ่านไม่สำเร็จ" });
  }
});

router.post("/password-resets/:id/temporary-password", verifyToken, requireAdmin, async (req, res) => {
  try {
    await ensurePasswordResetTables();

    const requestId = Number(req.params.id);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: "รหัสคำขอไม่ถูกต้อง" });
    }

    const [requests] = await db.query(
      `SELECT r.id, r.user_id, r.email, u.status AS user_status
       FROM password_reset_requests r
       JOIN users u ON u.id = r.user_id
       WHERE r.id = ?
       LIMIT 1`,
      [requestId],
    );

    const request = requests[0];
    if (!request) {
      return res.status(404).json({ message: "ไม่พบคำขอรีเซ็ตรหัสผ่าน" });
    }

    if (request.user_status && request.user_status !== "active") {
      return res.status(400).json({ message: "บัญชีนี้ไม่พร้อมใช้งาน" });
    }

    const temporaryPassword = createTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    await db.query(
      `UPDATE users
       SET password = ?, updated_at = NOW()
       WHERE id = ?`,
      [hashedPassword, request.user_id],
    );

    await db.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = ?
         AND used_at IS NULL`,
      [request.user_id],
    );

    await db.query(
      `UPDATE password_reset_requests
       SET status = 'temporary_password_created',
           handled_at = NOW(),
           handled_by = ?,
           admin_note = ?
       WHERE id = ?`,
      [
        req.user.id,
        String(req.body.note || "Admin created a temporary password").slice(0, 1000),
        requestId,
      ],
    );

    return res.json({
      message: "สร้างรหัสผ่านชั่วคราวแล้ว",
      temporary_password: temporaryPassword,
      login_url: `${getFrontendUrl()}/login`,
    });
  } catch (error) {
    console.error("POST /admin/password-resets/:id/temporary-password error:", error);
    return res.status(500).json({ message: "สร้างรหัสผ่านชั่วคราวไม่สำเร็จ" });
  }
});

router.patch("/password-resets/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    await ensurePasswordResetTables();

    const requestId = Number(req.params.id);
    const status = String(req.body.status || "").trim().toLowerCase();
    const allowedStatuses = ["pending", "link_created", "temporary_password_created", "resolved", "rejected"];

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: "รหัสคำขอไม่ถูกต้อง" });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "สถานะคำขอไม่ถูกต้อง" });
    }

    await db.query(
      `UPDATE password_reset_requests
       SET status = ?,
           handled_at = CASE WHEN ? = 'pending' THEN NULL ELSE NOW() END,
           handled_by = CASE WHEN ? = 'pending' THEN NULL ELSE ? END,
           admin_note = ?
       WHERE id = ?`,
      [
        status,
        status,
        status,
        req.user.id,
        String(req.body.note || "").slice(0, 1000) || null,
        requestId,
      ],
    );

    return res.json({ message: "อัปเดตคำขอรีเซ็ตรหัสผ่านแล้ว" });
  } catch (error) {
    console.error("PATCH /admin/password-resets/:id error:", error);
    return res.status(500).json({ message: "อัปเดตคำขอรีเซ็ตรหัสผ่านไม่สำเร็จ" });
  }
});

module.exports = router;
