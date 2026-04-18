const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

async function findBookById(bookId) {
  const [rows] = await db.query(
    `SELECT id, title, price, access_type
     FROM books
     WHERE id = ?
     LIMIT 1`,
    [bookId]
  );

  return rows[0] || null;
}

async function findEpisodeById(episodeId) {
  const [rows] = await db.query(
    `SELECT
       e.id,
       e.book_id,
       e.title,
       e.price,
       e.is_free,
       e.access_type,
       b.title AS book_title
     FROM book_episodes e
     JOIN books b ON b.id = e.book_id
     WHERE e.id = ?
     LIMIT 1`,
    [episodeId]
  );

  return rows[0] || null;
}

router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { book_id, episode_id, quantity = 1 } = req.body;

    if (!book_id && !episode_id) {
      return res.status(400).json({ message: "กรุณาเลือกหนังสือหรือตอน" });
    }

    if (book_id && episode_id) {
      return res.status(400).json({ message: "เพิ่มได้ทีละรายการเท่านั้น" });
    }

    const safeQty = Math.max(1, Number(quantity || 1));

    if (book_id) {
      const book = await findBookById(book_id);
      if (!book) return res.status(404).json({ message: "ไม่พบหนังสือ" });

      const [exists] = await db.query(
        `SELECT id
         FROM cart
         WHERE user_id = ? AND book_id = ? AND episode_id IS NULL
         LIMIT 1`,
        [userId, book_id]
      );

      if (exists.length > 0) {
        await db.query("UPDATE cart SET quantity = quantity + ? WHERE id = ?", [
          safeQty,
          exists[0].id,
        ]);
      } else {
        await db.query(
          "INSERT INTO cart (user_id, book_id, quantity) VALUES (?, ?, ?)",
          [userId, book_id, safeQty]
        );
      }

      return res.json({ message: "เพิ่มหนังสือลงตะกร้าสำเร็จ" });
    }

    const episode = await findEpisodeById(episode_id);
    if (!episode) return res.status(404).json({ message: "ไม่พบตอน" });

    const [exists] = await db.query(
      `SELECT id
       FROM cart
       WHERE user_id = ? AND episode_id = ? AND book_id IS NULL
       LIMIT 1`,
      [userId, episode_id]
    );

    if (exists.length > 0) {
      await db.query("UPDATE cart SET quantity = quantity + ? WHERE id = ?", [
        safeQty,
        exists[0].id,
      ]);
    } else {
      await db.query(
        "INSERT INTO cart (user_id, episode_id, quantity) VALUES (?, ?, ?)",
        [userId, episode_id, safeQty]
      );
    }

    return res.json({ message: "เพิ่มตอนลงตะกร้าสำเร็จ" });
  } catch (error) {
    console.error("POST /cart error:", error);
    return res.status(500).json({ message: "เพิ่มลงตะกร้าไม่สำเร็จ" });
  }
});

router.get("/", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         c.id,
         c.book_id,
         c.episode_id,
         c.quantity,
         COALESCE(e.title, b.title) AS title,
         b.title AS book_title,
         e.episode_number,
         COALESCE(e.price, b.price, 0) AS price,
         COALESCE(e.access_type, b.access_type, 'free') AS access_type
       FROM cart c
       LEFT JOIN books b ON c.book_id = b.id
       LEFT JOIN book_episodes e ON c.episode_id = e.id
       WHERE c.user_id = ?
       ORDER BY c.id DESC`,
      [req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /cart error:", error);
    return res.status(500).json({ message: "โหลดตะกร้าไม่สำเร็จ" });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM cart WHERE id = ? AND user_id = ?",
      [Number(req.params.id), req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "ไม่พบรายการในตะกร้าหรือคุณไม่มีสิทธิ์ลบ",
      });
    }

    return res.json({ message: "ลบรายการออกจากตะกร้าสำเร็จ" });
  } catch (error) {
    console.error("DELETE /cart/:id error:", error);
    return res.status(500).json({ message: "ลบรายการออกจากตะกร้าไม่สำเร็จ" });
  }
});

module.exports = router;
