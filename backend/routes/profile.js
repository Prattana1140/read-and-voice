const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

router.get("/me", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, role, status, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.user.id],
    );

    return res.json(rows[0] || null);
  } catch (error) {
    console.error("GET /profile/me error:", error);
    return res.status(500).json({ message: "ดึงข้อมูลโปรไฟล์ไม่สำเร็จ" });
  }
});

router.put("/me", verifyToken, async (req, res) => {
  try {
    const name = String(req.body.name || req.user.name || "").trim();
    const email = normalizeEmail(req.body.email || req.user.email);
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!name || !email) {
      return res.status(400).json({ message: "กรุณากรอกชื่อและอีเมล" });
    }

    const [users] = await db.query(
      "SELECT id, email, password FROM users WHERE id = ? LIMIT 1",
      [req.user.id],
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    }

    const currentUser = users[0];

    if (email !== normalizeEmail(currentUser.email)) {
      const [duplicates] = await db.query(
        "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? AND id <> ? LIMIT 1",
        [email, req.user.id],
      );

      if (duplicates.length > 0) {
        return res.status(400).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
      }
    }

    let passwordHash = currentUser.password;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          message: "กรุณากรอกรหัสผ่านปัจจุบันก่อนเปลี่ยนรหัสใหม่",
        });
      }

      const passwordText = String(currentUser.password || "");
      const isHashed =
        passwordText.startsWith("$2a$") ||
        passwordText.startsWith("$2b$") ||
        passwordText.startsWith("$2y$");
      const isMatch = isHashed
        ? await bcrypt.compare(currentPassword, passwordText)
        : currentPassword === passwordText;

      if (!isMatch) {
        return res.status(400).json({ message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
      }

      passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await db.query(
      `UPDATE users
       SET name = ?, email = ?, password = ?, updated_at = NOW()
       WHERE id = ?`,
      [name, email, passwordHash, req.user.id],
    );

    return res.json({ message: "อัปเดตโปรไฟล์สำเร็จ" });
  } catch (error) {
    console.error("PUT /profile/me error:", error);
    return res.status(500).json({ message: "อัปเดตโปรไฟล์ไม่สำเร็จ" });
  }
});

module.exports = router;
