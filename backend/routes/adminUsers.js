const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { requireSuperAdmin } = require("../middleware/superadmin");

// ดูผู้ใช้ทั้งหมด
router.get("/users", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, email, role, created_at
      FROM users
      ORDER BY id DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("GET /admin/users error:", error);
    res.status(500).json({ message: "โหลดรายการผู้ใช้ไม่สำเร็จ" });
  }
});

// ดูผู้ใช้รายคน
router.get("/users/:id", verifyToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `
      SELECT id, name, email, role, created_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("GET /admin/users/:id error:", error);
    res.status(500).json({ message: "โหลดข้อมูลผู้ใช้ไม่สำเร็จ" });
  }
});

// เปลี่ยน role แบบกำหนดเอง
router.patch(
  "/users/:id/role",
  verifyToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const allowedRoles = ["user", "writer", "admin"];

      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: "role ไม่ถูกต้อง" });
      }

      const [users] = await db.query(
        "SELECT id, role FROM users WHERE id = ? LIMIT 1",
        [id]
      );

      if (users.length === 0) {
        return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
      }

      if (users[0].role === "superadmin") {
        return res
          .status(400)
          .json({ message: "ไม่สามารถแก้ role ของ superadmin ได้" });
      }

      await db.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);

      res.json({ message: `อัปเดต role เป็น ${role} สำเร็จ` });
    } catch (error) {
      console.error("PATCH /admin/users/:id/role error:", error);
      res.status(500).json({ message: "อัปเดต role ไม่สำเร็จ" });
    }
  }
);

// อนุมัติเป็น admin
router.patch(
  "/users/:id/approve-admin",
  verifyToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const [users] = await db.query(
        "SELECT id, role FROM users WHERE id = ? LIMIT 1",
        [id]
      );

      if (users.length === 0) {
        return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
      }

      if (users[0].role === "superadmin") {
        return res
          .status(400)
          .json({ message: "ไม่สามารถแก้ role ของ superadmin ได้" });
      }

      await db.query("UPDATE users SET role = 'admin' WHERE id = ?", [id]);

      res.json({ message: "อนุมัติเป็น admin สำเร็จ" });
    } catch (error) {
      console.error("PATCH /admin/users/:id/approve-admin error:", error);
      res.status(500).json({ message: "อนุมัติ admin ไม่สำเร็จ" });
    }
  }
);

// ยกเลิกสิทธิ์ admin กลับเป็น user
router.patch(
  "/users/:id/revoke-admin",
  verifyToken,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const [users] = await db.query(
        "SELECT id, role FROM users WHERE id = ? LIMIT 1",
        [id]
      );

      if (users.length === 0) {
        return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
      }

      if (users[0].role === "superadmin") {
        return res
          .status(400)
          .json({ message: "ไม่สามารถแก้ role ของ superadmin ได้" });
      }

      await db.query("UPDATE users SET role = 'user' WHERE id = ?", [id]);

      res.json({ message: "ยกเลิกสิทธิ์ admin สำเร็จ" });
    } catch (error) {
      console.error("PATCH /admin/users/:id/revoke-admin error:", error);
      res.status(500).json({ message: "ยกเลิกสิทธิ์ admin ไม่สำเร็จ" });
    }
  }
);

module.exports = router;