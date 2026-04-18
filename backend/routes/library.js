const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { book_id } = req.body;

    if (!book_id) {
      return res.status(400).json({ message: "กรอกข้อมูลไม่ครบ" });
    }

    const [exists] = await db.query(
      "SELECT id FROM `library` WHERE user_id = ? AND book_id = ?",
      [userId, book_id]
    );

    if (exists.length > 0) {
      return res.json({ message: "มีหนังสือเล่มนี้ในชั้นแล้ว" });
    }

    await db.query("INSERT INTO `library` (user_id, book_id) VALUES (?, ?)", [
      userId,
      book_id,
    ]);

    return res.json({ message: "เพิ่มเข้าชั้นหนังสือสำเร็จ" });
  } catch (error) {
    console.error("POST /library error:", error);
    return res.status(500).json({ message: "เพิ่มเข้าชั้นหนังสือไม่สำเร็จ" });
  }
});

router.get("/me", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
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
      FROM \`library\` l
      JOIN books b ON l.book_id = b.id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE l.user_id = ?
      ORDER BY l.id DESC`,
      [req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /library/me error:", error);
    return res.status(500).json({ message: "โหลดชั้นหนังสือไม่สำเร็จ" });
  }
});

router.delete("/:bookId", verifyToken, async (req, res) => {
  try {
    await db.query("DELETE FROM `library` WHERE user_id = ? AND book_id = ?", [
      req.user.id,
      req.params.bookId,
    ]);

    return res.json({ message: "ลบออกจากชั้นหนังสือสำเร็จ" });
  } catch (error) {
    console.error("DELETE /library/:bookId error:", error);
    return res.status(500).json({ message: "ลบออกจากชั้นหนังสือไม่สำเร็จ" });
  }
});

module.exports = router;
