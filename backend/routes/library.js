const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

// เพิ่มหนังสือเข้าชั้น
router.post("/", verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const { book_id } = req.body;

    if (!book_id) {
      return res.status(400).json({ message: "กรอกข้อมูลไม่ครบ" });
    }

    const [exists] = await db.query(
      "SELECT id FROM library WHERE user_id = ? AND book_id = ?",
      [user_id, book_id]
    );

    if (exists.length > 0) {
      return res.json({ message: "มีในชั้นแล้ว" });
    }

    await db.query(
      "INSERT INTO library (user_id, book_id) VALUES (?, ?)",
      [user_id, book_id]
    );

    res.json({ message: "เพิ่มสำเร็จ" });
  } catch (error) {
    console.error("POST library error:", error);
    res.status(500).json({ message: error.message });
  }
});

// โหลดรายการชั้นหนังสือของตัวเอง
router.get("/me", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `
      SELECT 
        l.id AS library_id,
        l.user_id,
        l.book_id,
        b.id,
        b.title,
        b.author,
        b.description,
        b.cover_image,
        b.total_pages,
        c.name AS category_name
      FROM library l
      JOIN books b ON l.book_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE l.user_id = ?
      ORDER BY l.id DESC
      `,
      [userId]
    );

    res.json(rows);
  } catch (error) {
    console.error("GET library error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ลบออกจากชั้น
router.delete("/:bookId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookId } = req.params;

    await db.query(
      "DELETE FROM library WHERE user_id = ? AND book_id = ?",
      [userId, bookId]
    );

    res.json({ message: "ลบสำเร็จ" });
  } catch (error) {
    console.error("DELETE library error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;