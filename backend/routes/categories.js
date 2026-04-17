const express = require("express");
const router = express.Router();
const db = require("../config/db");

// ดึงหมวดหมู่ทั้งหมด
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name
      FROM categories
      ORDER BY id ASC
    `);

    res.json(rows);
  } catch (error) {
    console.error("GET /categories error:", error);
    res.status(500).json({ message: "โหลดหมวดหมู่ไม่สำเร็จ" });
  }
});

module.exports = router;