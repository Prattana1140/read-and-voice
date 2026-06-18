const express = require("express");

const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { slugify } = require("../services/contentSegmenter");

const router = express.Router();

let writerTablesReady;

function isWriterLike(role) {
  return ["writer", "admin", "superadmin"].includes(role);
}

function normalizeOptionalText(value, maxLength) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return maxLength ? normalized.slice(0, maxLength) : normalized;
}

function buildDefaultWriterSlug(userId) {
  return `user-${Number(userId)}`;
}

function toPublicWriterProfile(row) {
  if (!row) return null;

  const pageSlug = String(row.page_slug || "").trim() || buildDefaultWriterSlug(row.id);
  const penName =
    String(row.pen_name || "").trim() ||
    String(row.author_name || "").trim() ||
    String(row.name || "").trim() ||
    "นักเขียน";

  return {
    id: row.id,
    user_id: row.id,
    name: row.name,
    role: row.role,
    pen_name: penName,
    page_slug: pageSlug,
    tagline: row.tagline || "",
    bio: row.bio || "",
    avatar_url: row.avatar_url || "",
    banner_url: row.banner_url || "",
    x_url: row.x_url || "",
    pinned_book_id: row.pinned_book_id || null,
    follower_count: Number(row.follower_count || 0),
    book_count: Number(row.book_count || 0),
    total_words: Number(row.total_words || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function ensureWriterTables() {
  if (!writerTablesReady) {
    writerTablesReady = Promise.all([
      db.query(`
        CREATE TABLE IF NOT EXISTS writer_profiles (
          user_id INT PRIMARY KEY,
          pen_name VARCHAR(120) NULL,
          page_slug VARCHAR(160) NULL,
          tagline VARCHAR(255) NULL,
          bio TEXT NULL,
          avatar_url TEXT NULL,
          banner_url TEXT NULL,
          x_url VARCHAR(255) NULL,
          pinned_book_id INT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_writer_profiles_page_slug (page_slug),
          CONSTRAINT fk_writer_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_writer_profiles_pinned_book FOREIGN KEY (pinned_book_id) REFERENCES books(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS account_follows (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          target_type VARCHAR(40) NOT NULL DEFAULT 'book',
          target_id INT NULL,
          target_name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_account_follows_user (user_id),
          INDEX idx_account_follows_target (target_type, target_id),
          CONSTRAINT fk_account_follows_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `),
    ]).then(() => true);
  }

  return writerTablesReady;
}

async function resolveWriterUserIdBySlug(slug) {
  const normalizedSlug = String(slug || "").trim();
  if (!normalizedSlug) return null;

  const directIdMatch = normalizedSlug.match(/^user-(\d+)$/);
  if (directIdMatch) {
    return Number(directIdMatch[1]);
  }

  const [rows] = await db.query(
    `SELECT user_id
     FROM writer_profiles
     WHERE page_slug = ?
     LIMIT 1`,
    [normalizedSlug],
  );

  return rows.length > 0 ? Number(rows[0].user_id) : null;
}

async function fetchWriterProfileByUserId(userId) {
  const [rows] = await db.query(
    `SELECT
       u.id,
       u.name,
       u.role,
       u.created_at,
       wp.pen_name,
       wp.page_slug,
       wp.tagline,
       wp.bio,
       wp.avatar_url,
       wp.banner_url,
       wp.x_url,
       wp.pinned_book_id,
       wp.updated_at,
       (
         SELECT COUNT(*)
         FROM account_follows af
         WHERE af.target_type = 'writer'
           AND (
             af.target_id = u.id
             OR (
               af.target_id IS NULL
               AND af.target_name COLLATE utf8mb4_unicode_ci = COALESCE(
                 NULLIF(wp.pen_name, '') COLLATE utf8mb4_unicode_ci,
                 u.name COLLATE utf8mb4_unicode_ci
               )
             )
           )
       ) AS follower_count,
       (
         SELECT COUNT(*)
         FROM books b
         WHERE b.created_by = u.id AND b.is_published = 1
       ) AS book_count,
       (
         SELECT COALESCE(SUM(COALESCE(b.total_words, 0)), 0)
         FROM books b
         WHERE b.created_by = u.id AND b.is_published = 1
       ) AS total_words
     FROM users u
     LEFT JOIN writer_profiles wp ON wp.user_id = u.id
     WHERE u.id = ?
       AND u.role IN ('writer', 'admin', 'superadmin')
     LIMIT 1`,
    [userId],
  );

  return toPublicWriterProfile(rows[0] || null);
}

async function fetchWriterBooks(userId, pinnedBookId = null, includeDrafts = false) {
  const [rows] = await db.query(
    `SELECT
       b.id,
       b.slug,
       b.title,
       b.subtitle,
       b.author,
       b.description,
       b.cover_image,
       b.cover_image_url,
       b.content_type,
       b.access_type,
       b.price,
       b.total_words,
       b.estimated_reading_minutes,
       b.created_at,
       b.updated_at,
       c.name AS category_name
     FROM books b
     LEFT JOIN categories c ON c.id = b.category_id
     WHERE b.created_by = ?
       AND (? = 1 OR b.is_published = 1)
     ORDER BY
       CASE WHEN b.id = ? THEN 0 ELSE 1 END,
       b.updated_at DESC,
       b.created_at DESC`,
    [userId, includeDrafts ? 1 : 0, Number(pinnedBookId || 0)],
  );

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    author: row.author,
    description: row.description,
    cover_image: row.cover_image_url || row.cover_image || "",
    content_type: row.content_type,
    access_type: row.access_type,
    price: Number(row.price || 0),
    total_words: Number(row.total_words || 0),
    estimated_reading_minutes: Number(row.estimated_reading_minutes || 0),
    category_name: row.category_name || "",
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_pinned: Number(row.id) === Number(pinnedBookId || 0),
  }));
}

router.get("/me/profile", verifyToken, async (req, res) => {
  try {
    await ensureWriterTables();

    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนักเขียน" });
    }

    const profile = await fetchWriterProfileByUserId(req.user.id);
    const books = await fetchWriterBooks(req.user.id, profile?.pinned_book_id || null, true);

    return res.json({
      profile,
      books,
    });
  } catch (error) {
    console.error("GET /writers/me/profile error:", error);
    return res.status(500).json({ message: "โหลดข้อมูลหน้าสาธารณะของนักเขียนไม่สำเร็จ" });
  }
});

router.put("/me/profile", verifyToken, async (req, res) => {
  try {
    await ensureWriterTables();

    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์แก้ไขข้อมูลนักเขียน" });
    }

    const penName = normalizeOptionalText(req.body.pen_name, 120);
    const requestedSlug = normalizeOptionalText(req.body.page_slug, 160);
    const pageSlug = requestedSlug
      ? slugify(requestedSlug, buildDefaultWriterSlug(req.user.id))
      : buildDefaultWriterSlug(req.user.id);
    const tagline = normalizeOptionalText(req.body.tagline, 255);
    const bio = normalizeOptionalText(req.body.bio, 4000);
    const avatarUrl = normalizeOptionalText(req.body.avatar_url);
    const bannerUrl = normalizeOptionalText(req.body.banner_url);
    const xUrl = normalizeOptionalText(req.body.x_url, 255);
    const pinnedBookId = req.body.pinned_book_id ? Number(req.body.pinned_book_id) : null;

    const [duplicates] = await db.query(
      `SELECT user_id
       FROM writer_profiles
       WHERE page_slug = ? AND user_id <> ?
       LIMIT 1`,
      [pageSlug, req.user.id],
    );

    if (duplicates.length > 0) {
      return res.status(400).json({ message: "slug หน้านักเขียนนี้ถูกใช้งานแล้ว" });
    }

    if (pinnedBookId) {
      const [ownedBooks] = await db.query(
        "SELECT id FROM books WHERE id = ? AND created_by = ? LIMIT 1",
        [pinnedBookId, req.user.id],
      );

      if (ownedBooks.length === 0) {
        return res.status(400).json({ message: "เลือกผลงานเด่นได้เฉพาะหนังสือของคุณเอง" });
      }
    }

    await db.query(
      `INSERT INTO writer_profiles
       (user_id, pen_name, page_slug, tagline, bio, avatar_url, banner_url, x_url, pinned_book_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         pen_name = VALUES(pen_name),
         page_slug = VALUES(page_slug),
         tagline = VALUES(tagline),
         bio = VALUES(bio),
         avatar_url = VALUES(avatar_url),
         banner_url = VALUES(banner_url),
         x_url = VALUES(x_url),
         pinned_book_id = VALUES(pinned_book_id),
         updated_at = NOW()`,
      [
        req.user.id,
        penName,
        pageSlug,
        tagline,
        bio,
        avatarUrl,
        bannerUrl,
        xUrl,
        pinnedBookId,
      ],
    );

    const profile = await fetchWriterProfileByUserId(req.user.id);
    const books = await fetchWriterBooks(req.user.id, profile?.pinned_book_id || null, true);

    return res.json({
      message: "บันทึกข้อมูลหน้าสาธารณะของนักเขียนสำเร็จ",
      profile,
      books,
    });
  } catch (error) {
    console.error("PUT /writers/me/profile error:", error);
    return res.status(500).json({ message: "บันทึกข้อมูลหน้าสาธารณะของนักเขียนไม่สำเร็จ" });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    await ensureWriterTables();

    const userId = await resolveWriterUserIdBySlug(req.params.slug);
    if (!userId) {
      return res.status(404).json({ message: "ไม่พบหน้านักเขียน" });
    }

    const profile = await fetchWriterProfileByUserId(userId);
    if (!profile) {
      return res.status(404).json({ message: "ไม่พบหน้านักเขียน" });
    }

    const books = await fetchWriterBooks(userId, profile.pinned_book_id, false);
    const featuredBook = books.find((book) => book.is_pinned) || books[0] || null;

    return res.json({
      profile,
      featured_book: featuredBook,
      books,
    });
  } catch (error) {
    console.error("GET /writers/:slug error:", error);
    return res.status(500).json({ message: "โหลดหน้านักเขียนไม่สำเร็จ" });
  }
});

module.exports = router;
