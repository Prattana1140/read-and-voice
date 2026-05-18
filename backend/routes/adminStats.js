const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = express.Router();
const supportedSocialProvider = "line";

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

const systemSections = new Set([
  "login-events",
  "social-connections",
  "reading-activity",
  "user-assets",
  "benefits",
  "empty-data",
]);

function normalizeLimit(value, fallback = 100) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0) return fallback;
  return Math.min(limit, 300);
}

async function getTableCount(tableName) {
  const [[row]] = await db.query(`SELECT COUNT(*) AS total FROM \`${tableName}\``);
  return Number(row?.total || 0);
}

router.get("/system-data/:section", verifyToken, requireAdmin, async (req, res) => {
  try {
    const section = String(req.params.section || "").trim();
    const limit = normalizeLimit(req.query.limit);

    if (!systemSections.has(section)) {
      return res.status(400).json({ message: "Invalid system data section" });
    }

    if (section === "login-events") {
      const [items] = await db.query(
        `SELECT
           le.id,
           le.user_id,
           u.name,
           u.email,
           le.provider,
           le.success,
           le.ip_address,
           le.user_agent,
           le.message,
           le.created_at
         FROM login_events le
         LEFT JOIN users u ON u.id = le.user_id
         ORDER BY le.created_at DESC, le.id DESC
         LIMIT ?`,
        [limit],
      );

      const [[summary]] = await db.query(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS success_count,
           SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) AS failure_count
         FROM login_events`,
      );

      return res.json({ section, summary, items });
    }

    if (section === "social-connections") {
      const [items] = await db.query(
        `SELECT
           sc.id,
           sc.user_id,
           u.name,
           u.email AS account_email,
           sc.provider,
           sc.provider_user_id,
           sc.display_name,
           sc.email,
           sc.avatar_url,
           sc.connected_at,
           sc.updated_at
         FROM social_connections sc
         LEFT JOIN users u ON u.id = sc.user_id
         WHERE sc.provider = ?
         ORDER BY sc.updated_at DESC, sc.connected_at DESC, sc.id DESC
         LIMIT ?`,
        [supportedSocialProvider, limit],
      );

      const [providers] = await db.query(
        `SELECT provider, COUNT(*) AS total
         FROM social_connections
         WHERE provider = ?
         GROUP BY provider
         ORDER BY total DESC, provider ASC`,
        [supportedSocialProvider],
      );

      const [[summary]] = await db.query(
        `SELECT COUNT(*) AS total
         FROM social_connections
         WHERE provider = ?`,
        [supportedSocialProvider],
      );

      return res.json({
        section,
        summary: {
          total: Number(summary?.total || 0),
          providers,
        },
        items,
      });
    }

    if (section === "reading-activity") {
      const [topBooks] = await db.query(
        `SELECT
           b.id,
           b.title,
           COUNT(bv.id) AS views,
           COUNT(DISTINCT bv.user_id) AS readers,
           MAX(bv.viewed_at) AS last_viewed_at
         FROM book_views bv
         LEFT JOIN books b ON b.id = bv.book_id
         GROUP BY b.id, b.title
         ORDER BY views DESC, last_viewed_at DESC
         LIMIT 25`,
      );

      const [topEpisodes] = await db.query(
        `SELECT
           be.id,
           be.book_id,
           be.title,
           b.title AS book_title,
           COUNT(ev.id) AS views,
           COUNT(DISTINCT ev.user_id) AS readers,
           MAX(ev.viewed_at) AS last_viewed_at
         FROM episode_views ev
         LEFT JOIN book_episodes be ON be.id = ev.episode_id
         LEFT JOIN books b ON b.id = be.book_id
         GROUP BY be.id, be.book_id, be.title, b.title
         ORDER BY views DESC, last_viewed_at DESC
         LIMIT 25`,
      );

      const [progress] = await db.query(
        `SELECT
           rp.id,
           rp.user_id,
           u.name,
           u.email,
           rp.book_id,
           b.title AS book_title,
           rp.reading_mode,
           rp.current_page,
           rp.progress_percent,
           rp.last_position_ms,
           rp.last_scroll_offset,
           rp.last_read_at
         FROM reading_progress rp
         LEFT JOIN users u ON u.id = rp.user_id
         LEFT JOIN books b ON b.id = rp.book_id
         ORDER BY rp.last_read_at DESC, rp.id DESC
         LIMIT ?`,
        [limit],
      );

      return res.json({
        section,
        summary: {
          book_views: await getTableCount("book_views"),
          episode_views: await getTableCount("episode_views"),
          reading_progress: await getTableCount("reading_progress"),
        },
        items: { top_books: topBooks, top_episodes: topEpisodes, progress },
      });
    }

    if (section === "user-assets") {
      const [devices] = await db.query(
        `SELECT
           ud.id,
           ud.user_id,
           u.name,
           u.email,
           ud.device_name,
           ud.platform,
           ud.last_used_at,
           ud.created_at
         FROM user_devices ud
         LEFT JOIN users u ON u.id = ud.user_id
         ORDER BY ud.last_used_at DESC, ud.created_at DESC
         LIMIT ?`,
        [limit],
      );

      const [notifications] = await db.query(
        `SELECT
           un.id,
           un.user_id,
           u.name,
           u.email,
           un.type,
           un.title,
           un.message,
           un.action_url,
           un.is_read,
           un.created_at,
           un.read_at
         FROM user_notifications un
         LEFT JOIN users u ON u.id = un.user_id
         ORDER BY un.created_at DESC, un.id DESC
         LIMIT ?`,
        [limit],
      );

      const [bookmarks] = await db.query(
        `SELECT
           bm.id,
           bm.user_id,
           u.name,
           u.email,
           bm.book_id,
           b.title AS book_title,
           bm.page_number,
           bm.text_position,
           bm.note,
           bm.created_at
         FROM bookmarks bm
         LEFT JOIN users u ON u.id = bm.user_id
         LEFT JOIN books b ON b.id = bm.book_id
         ORDER BY bm.created_at DESC, bm.id DESC
         LIMIT ?`,
        [limit],
      );

      return res.json({
        section,
        summary: {
          user_devices: await getTableCount("user_devices"),
          user_notifications: await getTableCount("user_notifications"),
          bookmarks: await getTableCount("bookmarks"),
        },
        items: { devices, notifications, bookmarks },
      });
    }

    if (section === "benefits") {
      const [benefits] = await db.query(
        `SELECT
           ub.id,
           ub.user_id,
           u.name,
           u.email,
           ub.title,
           ub.description,
           ub.status,
           ub.expires_at,
           ub.created_at
         FROM user_benefits ub
         LEFT JOIN users u ON u.id = ub.user_id
         ORDER BY ub.created_at DESC, ub.id DESC
         LIMIT ?`,
        [limit],
      );

      const [giftCodes] = await db.query(
        `SELECT
           gc.id,
           gc.user_id,
           u.name,
           u.email,
           gc.code,
           gc.description,
           gc.status,
           gc.created_at,
           gc.redeemed_at
         FROM gift_codes gc
         LEFT JOIN users u ON u.id = gc.user_id
         ORDER BY gc.created_at DESC, gc.id DESC
         LIMIT ?`,
        [limit],
      );

      const [ageVerifications] = await db.query(
        `SELECT
           av.id,
           av.user_id,
           u.name,
           u.email,
           av.status,
           av.document_type,
           av.note,
           av.submitted_at,
           av.reviewed_at,
           av.updated_at
         FROM age_verifications av
         LEFT JOIN users u ON u.id = av.user_id
         ORDER BY av.updated_at DESC, av.id DESC
         LIMIT ?`,
        [limit],
      );

      return res.json({
        section,
        summary: {
          user_benefits: await getTableCount("user_benefits"),
          gift_codes: await getTableCount("gift_codes"),
          age_verifications: await getTableCount("age_verifications"),
        },
        items: { benefits, gift_codes: giftCodes, age_verifications: ageVerifications },
      });
    }

    const emptyTables = [
      "book_assets",
      "book_files",
      "book_units",
      "book_unit_blocks",
      "book_unit_sentences",
      "bookmarks",
      "cart",
      "cart_items",
      "coin_topup_orders",
      "episode_comments",
      "user_notifications",
      "age_verifications",
    ];

    const counts = [];
    for (const tableName of emptyTables) {
      counts.push({ table: tableName, total: await getTableCount(tableName) });
    }

    return res.json({
      section,
      summary: {
        total_tables: counts.length,
        empty_tables: counts.filter((item) => item.total === 0).length,
      },
      items: counts,
    });
  } catch (error) {
    console.error("GET /admin/stats/system-data/:section error:", error);
    return res.status(500).json({ message: "Unable to load system data" });
  }
});

module.exports = router;
