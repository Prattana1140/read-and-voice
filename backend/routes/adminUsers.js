const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const { requireSuperAdmin } = require("../middleware/superadmin");

const router = express.Router();

router.get("/", verifyToken, requireAdmin, async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, role, status, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /admin/users error:", error);
    return res.status(500).json({ message: "ดึงรายชื่อสมาชิกไม่สำเร็จ" });
  }
});

router.put("/:id/status", verifyToken, requireAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { status } = req.body;

    if (!["active", "banned"].includes(status)) {
      return res.status(400).json({ message: "สถานะไม่ถูกต้อง" });
    }

    if (userId === Number(req.user.id)) {
      return res
        .status(400)
        .json({ message: "ไม่สามารถเปลี่ยนสถานะบัญชีตัวเองได้" });
    }

    const [result] = await db.query(
      "UPDATE users SET status = ? WHERE id = ?",
      [status, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    }

    return res.json({
      message:
        status === "banned"
          ? "แบนผู้ใช้งานสำเร็จ"
          : "ปลดแบนผู้ใช้งานสำเร็จ",
    });
  } catch (error) {
    console.error("PUT /admin/users/:id/status error:", error);
    return res.status(500).json({ message: "เปลี่ยนสถานะผู้ใช้ไม่สำเร็จ" });
  }
});

router.put("/:id/role", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;
    const allowedRoles = ["user", "writer", "admin", "superadmin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "role ไม่ถูกต้อง" });
    }

    const [result] = await db.query("UPDATE users SET role = ? WHERE id = ?", [
      role,
      userId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    }

    return res.json({ message: "เปลี่ยน role สำเร็จ" });
  } catch (error) {
    console.error("PUT /admin/users/:id/role error:", error);
    return res.status(500).json({ message: "เปลี่ยน role ไม่สำเร็จ" });
  }
});

module.exports = router;
