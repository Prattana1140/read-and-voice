const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

// บันทึก progress
router.post("/", verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const {
      book_id,
      current_page = 1,
      last_position = 0,
      progress_percent = 0,
      font_size = null,
      rate = null,
      pitch = null,
      volume = null,
      voice_name = null,
    } = req.body;

    if (!book_id || Number.isNaN(Number(book_id))) {
      return res.status(400).json({ message: "book_id ไม่ถูกต้อง" });
    }

    const [bookRows] = await db.query(
      "SELECT id FROM books WHERE id = ? LIMIT 1",
      [book_id]
    );

    if (bookRows.length === 0) {
      return res.status(404).json({ message: "ไม่พบหนังสือเล่มนี้" });
    }

    await db.query(
      `
      INSERT INTO reading_progress
      (
        user_id,
        book_id,
        current_page,
        last_position,
        progress_percent,
        font_size,
        rate,
        pitch,
        volume,
        voice_name,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        current_page = VALUES(current_page),
        last_position = VALUES(last_position),
        progress_percent = VALUES(progress_percent),
        font_size = VALUES(font_size),
        rate = VALUES(rate),
        pitch = VALUES(pitch),
        volume = VALUES(volume),
        voice_name = VALUES(voice_name),
        updated_at = NOW()
      `,
      [
        user_id,
        book_id,
        current_page,
        last_position,
        progress_percent,
        font_size,
        rate,
        pitch,
        volume,
        voice_name,
      ]
    );

    res.json({ message: "บันทึก progress สำเร็จ" });
  } catch (error) {
    console.error("POST /progress error:", error);
    res.status(500).json({ message: "บันทึก progress ไม่สำเร็จ" });
  }
});

// โหลด progress ของตัวเอง
router.get("/:bookId", verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const book_id = Number(req.params.bookId);

    if (!book_id || Number.isNaN(book_id)) {
      return res.status(400).json({ message: "bookId ไม่ถูกต้อง" });
    }

    const [rows] = await db.query(
      `
      SELECT
        user_id,
        book_id,
        current_page,
        last_position,
        progress_percent,
        font_size,
        rate,
        pitch,
        volume,
        voice_name,
        updated_at
      FROM reading_progress
      WHERE user_id = ? AND book_id = ?
      LIMIT 1
      `,
      [user_id, book_id]
    );

    if (rows.length === 0) {
      return res.json({
        current_page: 1,
        last_position: 0,
        progress_percent: 0,
        font_size: null,
        rate: null,
        pitch: null,
        volume: null,
        voice_name: null,
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("GET /progress/:bookId error:", error);
    res.status(500).json({ message: "โหลด progress ไม่สำเร็จ" });
  }
});

module.exports = router;