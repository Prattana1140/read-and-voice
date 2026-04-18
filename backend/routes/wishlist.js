const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

let tableReady;

async function ensureTable() {
  if (!tableReady) {
    tableReady = db
      .query(`
        CREATE TABLE IF NOT EXISTS wishlists (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          book_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_wishlists_user_book (user_id, book_id),
          INDEX idx_wishlists_user (user_id),
          CONSTRAINT fk_wishlists_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_wishlists_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        )
      `)
      .then(() => true);
  }

  return tableReady;
}

router.use(verifyToken);

router.get("/", async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await db.query(
      `SELECT
         w.id AS wishlist_id,
         w.book_id AS id,
         w.created_at,
         b.title,
         b.author,
         b.cover_image,
         b.cover_image AS cover,
         b.price,
         b.access_type,
         b.content_type
       FROM wishlists w
       JOIN books b ON b.id = w.book_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [req.user.id],
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /wishlist error:", error);
    return res.status(500).json({ message: "โหลดรายการที่อยากได้ไม่สำเร็จ" });
  }
});

router.post("/", async (req, res) => {
  try {
    await ensureTable();
    const bookId = Number(req.body.book_id);

    if (!bookId || Number.isNaN(bookId)) {
      return res.status(400).json({ message: "book_id ไม่ถูกต้อง" });
    }

    const [bookRows] = await db.query("SELECT id FROM books WHERE id = ? LIMIT 1", [
      bookId,
    ]);

    if (!bookRows.length) {
      return res.status(404).json({ message: "ไม่พบหนังสือ" });
    }

    await db.query(
      `INSERT IGNORE INTO wishlists (user_id, book_id)
       VALUES (?, ?)`,
      [req.user.id, bookId],
    );

    return res.json({ message: "เพิ่มรายการที่อยากได้สำเร็จ" });
  } catch (error) {
    console.error("POST /wishlist error:", error);
    return res.status(500).json({ message: "เพิ่มรายการที่อยากได้ไม่สำเร็จ" });
  }
});

router.delete("/:bookId", async (req, res) => {
  try {
    await ensureTable();
    await db.query("DELETE FROM wishlists WHERE user_id = ? AND book_id = ?", [
      req.user.id,
      req.params.bookId,
    ]);

    return res.json({ message: "ลบรายการที่อยากได้สำเร็จ" });
  } catch (error) {
    console.error("DELETE /wishlist/:bookId error:", error);
    return res.status(500).json({ message: "ลบรายการที่อยากได้ไม่สำเร็จ" });
  }
});

module.exports = router;
