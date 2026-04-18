const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

router.get("/me", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, role, status, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.user.id]
    );

    return res.json(rows[0] || null);
  } catch (error) {
    console.error("GET /profile/me error:", error);
    return res.status(500).json({ message: "ดึงข้อมูลโปรไฟล์ไม่สำเร็จ" });
  }
});

router.put("/me", verifyToken, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;

    const [users] = await db.query(
      "SELECT id, email, password FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    }

    const currentUser = users[0];

    if (email && email !== currentUser.email) {
      const [dup] = await db.query(
        "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
        [email, req.user.id]
      );

      if (dup.length > 0) {
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

      const isMatch = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isMatch) {
        return res.status(400).json({ message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
      }

      passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await db.query(
      "UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?",
      [name || req.user.name, email || req.user.email, passwordHash, req.user.id]
    );

    return res.json({ message: "อัปเดตโปรไฟล์สำเร็จ" });
  } catch (error) {
    console.error("PUT /profile/me error:", error);
    return res.status(500).json({ message: "อัปเดตโปรไฟล์ไม่สำเร็จ" });
  }
});

module.exports = router;
