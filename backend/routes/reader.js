const express = require("express");
const db = require("../config/db");
const { optionalVerifyToken } = require("../middleware/auth");
const { sanitizeBookText } = require("../services/fileParser");

const router = express.Router();

async function hasActiveSubscription(userId) {
  if (!userId) return false;

  const [rows] = await db.query(
    `SELECT id
     FROM user_subscriptions
     WHERE user_id = ?
       AND status = 'active'
       AND payment_status = 'paid'
       AND end_at > NOW()
     LIMIT 1`,
    [userId]
  );

  return rows.length > 0;
}

async function hasPurchasedBook(userId, bookId) {
  if (!userId) return false;

  const [rows] = await db.query(
    `SELECT oi.id
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.user_id = ?
       AND o.payment_status = 'paid'
       AND o.order_status = 'completed'
       AND oi.book_id = ?
     LIMIT 1`,
    [userId, bookId]
  );

  return rows.length > 0;
}

async function hasPurchasedEpisode(userId, episodeId) {
  if (!userId) return false;

  const [rows] = await db.query(
    `SELECT oi.id
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.user_id = ?
       AND o.payment_status = 'paid'
       AND o.order_status = 'completed'
       AND oi.episode_id = ?
     LIMIT 1`,
    [userId, episodeId]
  );

  return rows.length > 0;
}

async function isBookOwnerOrAdmin(user, bookId) {
  if (!user) return false;
  if (["admin", "superadmin"].includes(user.role)) return true;

  const [rows] = await db.query(
    "SELECT id FROM books WHERE id = ? AND created_by = ? LIMIT 1",
    [bookId, user.id]
  );

  return rows.length > 0;
}

async function getBookFullText(bookId, fullText) {
  if (fullText) return sanitizeBookText(fullText);

  const [pages] = await db.query(
    `SELECT page_text
     FROM book_pages
     WHERE book_id = ?
     ORDER BY page_number ASC`,
    [bookId]
  );

  return sanitizeBookText(
    pages.map((page) => page.page_text || "").filter(Boolean).join("\n\n"),
  );
}

router.get("/books/:bookId/content", optionalVerifyToken, async (req, res) => {
  try {
    const { bookId } = req.params;

    const [books] = await db.query(
      `SELECT id, title, access_type, price, created_by, full_text
       FROM books
       WHERE id = ?
       LIMIT 1`,
      [bookId]
    );

    if (books.length === 0) {
      return res.status(404).json({ message: "ไม่พบหนังสือ" });
    }

    const book = books[0];
    const ownerOrAdmin = await isBookOwnerOrAdmin(req.user, book.id);
    const subscribed = await hasActiveSubscription(req.user?.id);
    const purchased = await hasPurchasedBook(req.user?.id, book.id);

    let allowRead = false;
    let lockReason = null;

    if (ownerOrAdmin) allowRead = true;
    else if (book.access_type === "free") allowRead = true;
    else if (book.access_type === "paid" && purchased) allowRead = true;
    else if (book.access_type === "subscription" && subscribed) allowRead = true;

    if (!allowRead) {
      if (book.access_type === "paid") lockReason = "ต้องซื้อหนังสือก่อน";
      if (book.access_type === "subscription") {
        lockReason = "ต้องสมัครสมาชิกรายเดือนก่อน";
      }

      return res.json({
        is_locked: true,
        lock_reason: lockReason,
        title: book.title,
        access_type: book.access_type,
        content: "",
      });
    }

    return res.json({
      is_locked: false,
      title: book.title,
      access_type: book.access_type,
      content: await getBookFullText(book.id, book.full_text),
    });
  } catch (error) {
    console.error("GET /reader/books/:bookId/content error:", error);
    return res.status(500).json({ message: "โหลดเนื้อหาหนังสือไม่สำเร็จ" });
  }
});

router.get("/episodes/:episodeId/content", optionalVerifyToken, async (req, res) => {
  try {
    const { episodeId } = req.params;

    const [episodes] = await db.query(
      `SELECT
         e.id,
         e.book_id,
         e.title,
         e.content,
         e.access_type,
         e.price,
         e.is_free,
         b.created_by
       FROM book_episodes e
       JOIN books b ON b.id = e.book_id
       WHERE e.id = ?
       LIMIT 1`,
      [episodeId]
    );

    if (episodes.length === 0) {
      return res.status(404).json({ message: "ไม่พบตอน" });
    }

    const episode = episodes[0];
    const ownerOrAdmin = await isBookOwnerOrAdmin(req.user, episode.book_id);
    const subscribed = await hasActiveSubscription(req.user?.id);
    const purchased = await hasPurchasedEpisode(req.user?.id, episode.id);

    let allowRead = false;
    let lockReason = null;

    if (ownerOrAdmin) allowRead = true;
    else if (Number(episode.is_free) === 1 || episode.access_type === "free") {
      allowRead = true;
    } else if (episode.access_type === "paid" && purchased) {
      allowRead = true;
    } else if (episode.access_type === "subscription" && subscribed) {
      allowRead = true;
    }

    if (!allowRead) {
      if (episode.access_type === "paid") lockReason = "ต้องซื้อตอนนี้ก่อน";
      if (episode.access_type === "subscription") {
        lockReason = "ต้องสมัครสมาชิกรายเดือนก่อน";
      }

      return res.json({
        is_locked: true,
        lock_reason: lockReason,
        title: episode.title,
        access_type: episode.access_type,
        content: "",
      });
    }

    return res.json({
      is_locked: false,
      title: episode.title,
      access_type: episode.access_type,
      content: sanitizeBookText(episode.content || ""),
    });
  } catch (error) {
    console.error("GET /reader/episodes/:episodeId/content error:", error);
    return res.status(500).json({ message: "โหลดเนื้อหาตอนไม่สำเร็จ" });
  }
});

module.exports = router;
