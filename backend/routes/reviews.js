const express = require("express");
const db = require("../config/db");
const { optionalVerifyToken, verifyToken } = require("../middleware/auth");

const router = express.Router();

let tableReady;

async function ensureReviewTable() {
  if (!tableReady) {
    tableReady = db
      .query(`
        CREATE TABLE IF NOT EXISTS book_reviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          book_id INT NOT NULL,
          rating INT NOT NULL,
          comment TEXT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_book_reviews_user_id (user_id),
          INDEX idx_book_reviews_book_id (book_id),
          CONSTRAINT fk_book_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_book_reviews_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      .then(() => true);
  }

  return tableReady;
}

function normalizeRating(value) {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return rating;
}

async function findReview(reviewId) {
  const [rows] = await db.query(
    `SELECT id, user_id, book_id, rating, comment
     FROM book_reviews
     WHERE id = ?
     LIMIT 1`,
    [reviewId]
  );

  return rows[0] || null;
}

function canManageReview(user, review) {
  if (!user || !review) return false;
  if (["admin", "superadmin"].includes(user.role)) return true;
  return Number(user.id) === Number(review.user_id);
}

router.get("/books/:bookId/reviews", optionalVerifyToken, async (req, res) => {
  try {
    await ensureReviewTable();
    const bookId = Number(req.params.bookId);

    if (!Number.isInteger(bookId) || bookId <= 0) {
      return res.status(400).json({ message: "bookId ไม่ถูกต้อง" });
    }

    const [bookRows] = await db.query("SELECT id FROM books WHERE id = ? LIMIT 1", [
      bookId,
    ]);

    if (bookRows.length === 0) {
      return res.status(404).json({ message: "ไม่พบหนังสือ" });
    }

    const [reviews] = await db.query(
      `SELECT
         r.id,
         r.user_id,
         r.book_id,
         r.rating,
         r.comment,
         r.created_at,
         r.updated_at,
         COALESCE(u.name, 'Reader') AS user_name
       FROM book_reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.book_id = ?
       ORDER BY r.created_at DESC, r.id DESC`,
      [bookId]
    );

    const [summaryRows] = await db.query(
      `SELECT
         COUNT(*) AS review_count,
         COALESCE(AVG(rating), 0) AS average_rating
       FROM book_reviews
       WHERE book_id = ?`,
      [bookId]
    );

    const summary = summaryRows[0] || {};

    return res.json({
      items: reviews.map((review) => ({
        ...review,
        can_manage: canManageReview(req.user, review),
      })),
      summary: {
        review_count: Number(summary.review_count || 0),
        average_rating: Number(summary.average_rating || 0),
      },
    });
  } catch (error) {
    console.error("GET /books/:bookId/reviews error:", error);
    return res.status(500).json({ message: "โหลดรีวิวไม่สำเร็จ" });
  }
});

router.post("/books/:bookId/reviews", verifyToken, async (req, res) => {
  try {
    await ensureReviewTable();
    const bookId = Number(req.params.bookId);
    const rating = normalizeRating(req.body.rating);
    const comment = String(req.body.comment || "").trim();

    if (!Number.isInteger(bookId) || bookId <= 0) {
      return res.status(400).json({ message: "bookId ไม่ถูกต้อง" });
    }

    if (!rating) {
      return res.status(400).json({ message: "คะแนนต้องอยู่ระหว่าง 1-5" });
    }

    if (!comment) {
      return res.status(400).json({ message: "กรุณาเขียนความคิดเห็น" });
    }

    const [bookRows] = await db.query("SELECT id FROM books WHERE id = ? LIMIT 1", [
      bookId,
    ]);

    if (bookRows.length === 0) {
      return res.status(404).json({ message: "ไม่พบหนังสือ" });
    }

    const [result] = await db.query(
      `INSERT INTO book_reviews (user_id, book_id, rating, comment)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, bookId, rating, comment]
    );

    return res.status(201).json({
      message: "เพิ่มรีวิวสำเร็จ",
      review_id: result.insertId,
    });
  } catch (error) {
    console.error("POST /books/:bookId/reviews error:", error);
    return res.status(500).json({ message: "เพิ่มรีวิวไม่สำเร็จ" });
  }
});

router.put("/reviews/:reviewId", verifyToken, async (req, res) => {
  try {
    await ensureReviewTable();
    const reviewId = Number(req.params.reviewId);
    const rating = normalizeRating(req.body.rating);
    const comment = String(req.body.comment || "").trim();

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return res.status(400).json({ message: "reviewId ไม่ถูกต้อง" });
    }

    if (!rating) {
      return res.status(400).json({ message: "คะแนนต้องอยู่ระหว่าง 1-5" });
    }

    if (!comment) {
      return res.status(400).json({ message: "กรุณาเขียนความคิดเห็น" });
    }

    const review = await findReview(reviewId);
    if (!review) return res.status(404).json({ message: "ไม่พบรีวิว" });

    if (!canManageReview(req.user, review)) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์แก้รีวิวนี้" });
    }

    await db.query(
      `UPDATE book_reviews
       SET rating = ?, comment = ?, updated_at = NOW()
       WHERE id = ?`,
      [rating, comment, reviewId]
    );

    return res.json({ message: "แก้ไขรีวิวสำเร็จ" });
  } catch (error) {
    console.error("PUT /reviews/:reviewId error:", error);
    return res.status(500).json({ message: "แก้ไขรีวิวไม่สำเร็จ" });
  }
});

router.delete("/reviews/:reviewId", verifyToken, async (req, res) => {
  try {
    await ensureReviewTable();
    const reviewId = Number(req.params.reviewId);

    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      return res.status(400).json({ message: "reviewId ไม่ถูกต้อง" });
    }

    const review = await findReview(reviewId);
    if (!review) return res.status(404).json({ message: "ไม่พบรีวิว" });

    if (!canManageReview(req.user, review)) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์ลบรีวิวนี้" });
    }

    await db.query("DELETE FROM book_reviews WHERE id = ?", [reviewId]);

    return res.json({ message: "ลบรีวิวสำเร็จ" });
  } catch (error) {
    console.error("DELETE /reviews/:reviewId error:", error);
    return res.status(500).json({ message: "ลบรีวิวไม่สำเร็จ" });
  }
});

module.exports = router;
