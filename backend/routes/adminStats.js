const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = express.Router();

router.get("/summary", verifyToken, requireAdmin, async (_req, res) => {
  try {
    const [[users]] = await db.query("SELECT COUNT(*) AS total_users FROM users");
    const [[books]] = await db.query("SELECT COUNT(*) AS total_books FROM books");
    const [[categories]] = await db.query(
      "SELECT COUNT(*) AS total_categories FROM categories"
    );
    const [[subs]] = await db.query(
      `SELECT COUNT(*) AS active_subscriptions
       FROM user_subscriptions
       WHERE status = 'active' AND payment_status = 'paid' AND end_at > NOW()`
    );

    const [popularBooks] = await db.query(
      `SELECT b.id, b.title, COUNT(oi.id) AS total_sales
       FROM order_items oi
       JOIN books b ON b.id = oi.book_id
       JOIN orders o ON o.id = oi.order_id
       WHERE o.payment_status = 'paid'
       GROUP BY b.id, b.title
       ORDER BY total_sales DESC
       LIMIT 5`
    );

    return res.json({
      total_users: users.total_users,
      total_books: books.total_books,
      total_categories: categories.total_categories,
      active_subscriptions: subs.active_subscriptions,
      popular_books: popularBooks,
    });
  } catch (error) {
    console.error("GET /admin/stats/summary error:", error);
    return res.status(500).json({ message: "ดึงสถิติไม่สำเร็จ" });
  }
});

module.exports = router;
