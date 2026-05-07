const express = require("express");
const db = require("../config/db");
const { ensureCatalogAnalyticsSchema } = require("../services/catalogSchema");

const router = express.Router();

const PUBLIC_BOOK_FIELDS = `SELECT
         b.*,
         c.name AS category_name,
         (
           SELECT COUNT(*)
           FROM book_reviews r
           WHERE r.book_id = b.id
         ) AS review_count,
         ROUND(
           COALESCE(
             (
               SELECT AVG(r.rating)
               FROM book_reviews r
               WHERE r.book_id = b.id
             ),
             0
           ),
           1
         ) AS average_rating,
         (
           SELECT COUNT(*)
           FROM book_views v
           WHERE v.book_id = b.id
         ) AS read_count,
         GREATEST(
           COALESCE(TIMESTAMPDIFF(DAY, NOW(), b.promo_end_at), 0),
           0
         ) AS promo_days_left,
         (
           SELECT COUNT(*)
           FROM book_episodes e
           WHERE e.book_id = b.id AND e.is_published = 1
         ) AS episode_count
       FROM books b
       LEFT JOIN categories c ON c.id = b.category_id
       WHERE b.is_published = 1
         AND COALESCE(b.approval_status, 'approved') = 'approved'`;

async function listBooks(orderBy, extraWhere = "", params = [], limit = 120) {
  const [rows] = await db.query(
    `${PUBLIC_BOOK_FIELDS}
       ${extraWhere}
       ${orderBy}
       LIMIT ?`,
    [...params, limit]
  );

  return rows;
}

async function sendShelf(res, shelf, loader) {
  try {
    await ensureCatalogAnalyticsSchema();
    const books = await loader();
    return res.json({ shelf, books, count: books.length });
  } catch (error) {
    console.error(`GET /${shelf} error:`, error);
    return res.status(500).json({ message: "Unable to load shelf" });
  }
}

router.get("/ebooks", (_req, res) => {
  return sendShelf(res, "ebooks", () =>
    listBooks("ORDER BY b.created_at DESC, b.id DESC", "AND COALESCE(b.content_type, 'ebook') = 'ebook'")
  );
});

router.get("/serials", (_req, res) => {
  return sendShelf(res, "serials", () =>
    listBooks("ORDER BY episode_count DESC, b.created_at DESC, b.id DESC", "AND COALESCE(b.content_type, 'ebook') = 'serial'")
  );
});

router.get("/best-sellers", (_req, res) => {
  return sendShelf(res, "best-sellers", () =>
    listBooks("ORDER BY b.is_best_seller DESC, b.id DESC", "AND COALESCE(b.is_best_seller, 0) = 1")
  );
});

router.get("/new-releases", (_req, res) => {
  return sendShelf(res, "new-releases", () =>
    listBooks(
      "ORDER BY b.is_new_release DESC, b.created_at DESC, b.id DESC",
      "AND COALESCE(b.is_new_release, 0) = 1",
    )
  );
});

router.get("/promotions", (_req, res) => {
  return sendShelf(res, "promotions", () =>
    listBooks(
      "ORDER BY COALESCE(b.promo_discount_percent, 0) DESC, b.promo_end_at ASC, b.created_at DESC, b.id DESC",
      "AND COALESCE(b.is_promotion, 0) = 1 AND (b.promo_end_at IS NULL OR b.promo_end_at >= NOW())",
    )
  );
});

router.get("/free-books", (_req, res) => {
  return sendShelf(res, "free-books", () =>
    listBooks(
      "ORDER BY b.is_free_book DESC, b.created_at DESC, b.id DESC",
      "AND COALESCE(b.is_free_book, 0) = 1",
    )
  );
});

router.get("/hall-of-fame", (_req, res) => {
  return sendShelf(res, "hall-of-fame", () =>
    listBooks(
      "ORDER BY b.is_hall_of_fame DESC, COALESCE(b.total_pages, 0) DESC, b.id DESC",
      "AND COALESCE(b.is_hall_of_fame, 0) = 1",
    )
  );
});

router.get("/recommended", (_req, res) => {
  return sendShelf(res, "recommended", () =>
    listBooks(
      "ORDER BY b.is_recommended DESC, b.updated_at DESC, b.created_at DESC, b.id DESC",
      "AND COALESCE(b.is_recommended, 0) = 1",
    )
  );
});

router.get("/subscription", (_req, res) => {
  return sendShelf(res, "subscription", () =>
    listBooks("ORDER BY b.created_at DESC, b.id DESC", "AND COALESCE(b.access_type, 'free') = 'subscription'")
  );
});

module.exports = router;
