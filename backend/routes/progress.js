const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

router.post("/", verifyToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.id;
    const {
      book_id,
      current_page = 1,
      last_position = 0,
      progress_percent = 0,
      rate = null,
      pitch = null,
      volume = null,
      voice_name = null,
    } = req.body;

    if (!book_id || Number.isNaN(Number(book_id))) {
      return res.status(400).json({ message: "book_id ไม่ถูกต้อง" });
    }

    const [bookRows] = await connection.query(
      "SELECT id FROM books WHERE id = ? LIMIT 1",
      [book_id]
    );

    if (bookRows.length === 0) {
      return res.status(404).json({ message: "ไม่พบหนังสือเล่มนี้" });
    }

    await connection.beginTransaction();

    await connection.query(
      `
      INSERT INTO reading_progress
      (
        user_id,
        book_id,
        current_page,
        last_position,
        progress_percent,
        last_read_at
      )
      VALUES (?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        current_page = VALUES(current_page),
        last_position = VALUES(last_position),
        progress_percent = VALUES(progress_percent),
        last_read_at = NOW()
      `,
      [userId, book_id, current_page, last_position, progress_percent]
    );

    await connection.query(
      `
      INSERT INTO tts_settings
      (
        user_id,
        rate,
        pitch,
        volume,
        voice_name,
        lang,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'th-TH', NOW())
      ON DUPLICATE KEY UPDATE
        rate = COALESCE(VALUES(rate), rate),
        pitch = COALESCE(VALUES(pitch), pitch),
        volume = COALESCE(VALUES(volume), volume),
        voice_name = COALESCE(VALUES(voice_name), voice_name),
        updated_at = NOW()
      `,
      [userId, rate, pitch, volume, voice_name]
    );

    await connection.commit();

    return res.json({ message: "บันทึก progress สำเร็จ" });
  } catch (error) {
    await connection.rollback();
    console.error("POST /progress error:", error);
    return res.status(500).json({ message: "บันทึก progress ไม่สำเร็จ" });
  } finally {
    connection.release();
  }
});

router.get("/:bookId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const bookId = Number(req.params.bookId);

    if (!bookId || Number.isNaN(bookId)) {
      return res.status(400).json({ message: "bookId ไม่ถูกต้อง" });
    }

    const [rows] = await db.query(
      `
      SELECT
        rp.user_id,
        rp.book_id,
        rp.current_page,
        rp.last_position,
        rp.progress_percent,
        rp.last_read_at AS updated_at,
        ts.rate,
        ts.pitch,
        ts.volume,
        ts.voice_name
      FROM reading_progress rp
      LEFT JOIN tts_settings ts ON ts.user_id = rp.user_id
      WHERE rp.user_id = ? AND rp.book_id = ?
      LIMIT 1
      `,
      [userId, bookId]
    );

    if (rows.length === 0) {
      const [settings] = await db.query(
        `
        SELECT rate, pitch, volume, voice_name
        FROM tts_settings
        WHERE user_id = ?
        LIMIT 1
        `,
        [userId]
      );

      return res.json({
        current_page: 1,
        last_position: 0,
        progress_percent: 0,
        font_size: null,
        rate: settings[0]?.rate ?? null,
        pitch: settings[0]?.pitch ?? null,
        volume: settings[0]?.volume ?? null,
        voice_name: settings[0]?.voice_name ?? null,
      });
    }

    return res.json({
      ...rows[0],
      font_size: null,
    });
  } catch (error) {
    console.error("GET /progress/:bookId error:", error);
    return res.status(500).json({ message: "โหลด progress ไม่สำเร็จ" });
  }
});

module.exports = router;
