const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

async function ensureLibraryHiddenTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS library_hidden (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      book_id INT NOT NULL,
      hidden_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_library_hidden_user_book (user_id, book_id),
      CONSTRAINT fk_library_hidden_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_library_hidden_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function hasPurchasedBook(userId, bookId) {
  const [rows] = await db.query(
    `SELECT oi.id
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE o.user_id = ?
       AND oi.book_id = ?
       AND o.payment_status = 'paid'
       AND o.order_status = 'completed'
     LIMIT 1`,
    [userId, bookId],
  );

  return rows.length > 0;
}

async function hasActiveSubscription(userId) {
  const [rows] = await db.query(
    `SELECT id
     FROM user_subscriptions
     WHERE user_id = ?
       AND status = 'active'
       AND payment_status = 'paid'
       AND end_at > NOW()
     LIMIT 1`,
    [userId],
  );

  return rows.length > 0;
}

function getBookAccessType(book) {
  if (["free", "paid", "subscription"].includes(book.access_type)) {
    return book.access_type;
  }

  return Number(book.price || 0) > 0 ? "paid" : "free";
}

router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { book_id } = req.body;

    if (!book_id) {
      return res.status(400).json({ message: "กรอกข้อมูลไม่ครบ" });
    }

    const [books] = await db.query(
      `SELECT id, access_type, price
       FROM books
       WHERE id = ? AND is_published = 1
       LIMIT 1`,
      [book_id],
    );

    const book = books[0];
    if (!book) {
      return res.status(404).json({ message: "ไม่พบหนังสือ" });
    }

    const accessType = getBookAccessType(book);
    const canAddToLibrary =
      accessType === "free" ||
      (accessType === "paid" && (await hasPurchasedBook(userId, book.id))) ||
      (accessType === "subscription" && (await hasActiveSubscription(userId)));

    if (!canAddToLibrary) {
      return res.status(402).json({
        message:
          accessType === "subscription"
            ? "หนังสือเล่มนี้ต้องสมัครแพ็กเกจก่อนเพิ่มเข้าคลัง"
            : "หนังสือเล่มนี้ต้องชำระเงินก่อนเพิ่มเข้าคลัง",
      });
    }

    await ensureLibraryHiddenTable();
    await db.query(
      "DELETE FROM library_hidden WHERE user_id = ? AND book_id = ?",
      [userId, book_id],
    );

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
    await ensureLibraryHiddenTable();

    const [rows] = await db.query(
      `SELECT
        owned.library_id,
        ? AS user_id,
        owned.book_id,
        b.id,
        b.title,
        b.author,
        b.description,
        b.cover_image,
        b.cover_image AS cover_url,
        b.access_type,
        b.content_type,
        b.price,
        b.total_pages,
        c.name AS category_name,
        owned.added_at AS created_at
      FROM (
        SELECT
          owned_source.book_id,
          MAX(owned_source.library_id) AS library_id,
          MAX(owned_source.added_at) AS added_at
        FROM (
          SELECT l.id AS library_id, l.book_id, l.created_at AS added_at
          FROM \`library\` l
          WHERE l.user_id = ?

          UNION ALL

          SELECT NULL AS library_id, oi.book_id, o.created_at AS added_at
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE o.user_id = ?
            AND o.payment_status = 'paid'
            AND o.order_status = 'completed'
            AND oi.book_id IS NOT NULL
        ) owned_source
        GROUP BY owned_source.book_id
      ) owned
      JOIN books b ON owned.book_id = b.id
      LEFT JOIN library_hidden lh
        ON lh.user_id = ? AND lh.book_id = owned.book_id
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.is_published = 1
        AND lh.id IS NULL
      ORDER BY owned.added_at DESC, owned.book_id DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /library/me error:", error);
    return res.status(500).json({ message: "โหลดชั้นหนังสือไม่สำเร็จ" });
  }
});

router.delete("/:bookId", verifyToken, async (req, res) => {
  try {
    await ensureLibraryHiddenTable();

    await db.query(
      `INSERT INTO library_hidden (user_id, book_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE hidden_at = CURRENT_TIMESTAMP`,
      [req.user.id, req.params.bookId],
    );

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
