const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, created_at, updated_at
       FROM categories
       ORDER BY name ASC`
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /categories error:", error);
    return res.status(500).json({ message: "ดึงหมวดหมู่ไม่สำเร็จ" });
  }
});

router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();

    if (!name) {
      return res.status(400).json({ message: "กรุณากรอกชื่อหมวดหมู่" });
    }

    const [exists] = await db.query(
      "SELECT id FROM categories WHERE name = ? LIMIT 1",
      [name]
    );

    if (exists.length > 0) {
      return res.status(400).json({ message: "หมวดหมู่นี้มีอยู่แล้ว" });
    }

    const [result] = await db.query(
      "INSERT INTO categories (name) VALUES (?)",
      [name]
    );

    return res.json({
      message: "สร้างหมวดหมู่สำเร็จ",
      id: result.insertId,
    });
  } catch (error) {
    console.error("POST /categories error:", error);
    return res.status(500).json({ message: "สร้างหมวดหมู่ไม่สำเร็จ" });
  }
});

router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const { id } = req.params;

    if (!name) {
      return res.status(400).json({ message: "กรุณากรอกชื่อหมวดหมู่" });
    }

    const [exists] = await db.query(
      "SELECT id FROM categories WHERE id = ? LIMIT 1",
      [id]
    );

    if (exists.length === 0) {
      return res.status(404).json({ message: "ไม่พบหมวดหมู่" });
    }

    await db.query("UPDATE categories SET name = ? WHERE id = ?", [name, id]);

    return res.json({ message: "แก้ไขหมวดหมู่สำเร็จ" });
  } catch (error) {
    console.error("PUT /categories/:id error:", error);
    return res.status(500).json({ message: "แก้ไขหมวดหมู่ไม่สำเร็จ" });
  }
});

router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [exists] = await db.query(
      "SELECT id FROM categories WHERE id = ? LIMIT 1",
      [id]
    );

    if (exists.length === 0) {
      return res.status(404).json({ message: "ไม่พบหมวดหมู่" });
    }

    await db.query("DELETE FROM categories WHERE id = ?", [id]);

    return res.json({ message: "ลบหมวดหมู่สำเร็จ" });
  } catch (error) {
    console.error("DELETE /categories/:id error:", error);
    return res.status(500).json({ message: "ลบหมวดหมู่ไม่สำเร็จ" });
  }
});

module.exports = router;
