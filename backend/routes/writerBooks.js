const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const {
  buildBlocksFromRawText,
  prepareStructuredContent,
  slugify,
} = require("../services/contentSegmenter");
const { ensureBookCover, ensureBooksHaveCovers, generateBookCoverPath } = require("../services/bookCover");
const { notifyWriterFollowersAboutEpisode } = require("../services/notifications");
const { isSystemFeatureEnabled } = require("../services/systemSettings");
const { ensureCatalogAnalyticsSchema } = require("../services/catalogSchema");

const router = express.Router();
const coverUploadDir = path.join(__dirname, "../uploads/book-covers");
const COVER_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
fs.mkdirSync(coverUploadDir, { recursive: true });

const coverFileFields = new Set([
  "cover_file",
  "cover",
  "image",
  "cover_image_file",
]);

const coverUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, coverUploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
      cb(null, `writer-cover-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: COVER_IMAGE_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!coverFileFields.has(file.fieldname)) return cb(null, false);
    if (file.mimetype && file.mimetype.startsWith("image/")) return cb(null, true);
    return cb(new Error("อัปโหลดรูปปกได้เฉพาะไฟล์รูปภาพเท่านั้น"));
  },
});

function uploadCoverFiles(req, res, next) {
  coverUpload.any()(req, res, (error) => {
    if (!error) return next();
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "ไฟล์รูปปกใหญ่เกินไป กรุณาเลือกไฟล์ไม่เกิน 15 MB"
        : error.message || "อัปโหลดรูปปกไม่สำเร็จ";
    return res.status(400).json({ message });
  });
}

function getUploadedCoverFile(req) {
  const files = Array.isArray(req.files)
    ? req.files
    : Object.values(req.files || {}).flat();

  return files.find((file) => coverFileFields.has(file.fieldname)) || null;
}

function getCoverImagePath(file, fallback = "") {
  if (!file) return String(fallback || "").trim();
  return `uploads/book-covers/${file.filename}`;
}

function isWriterLike(role) {
  return ["writer", "admin", "superadmin"].includes(role);
}

async function ensureBookOwner(bookId, user) {
  if (["admin", "superadmin"].includes(user.role)) return true;

  const [rows] = await db.query(
    "SELECT id FROM books WHERE id = ? AND created_by = ? LIMIT 1",
    [bookId, user.id]
  );

  return rows.length > 0;
}

function normalizePositiveInt(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeBookAccessType(value, price = 0) {
  if (["free", "paid", "subscription"].includes(value)) return value;
  return Number(price || 0) > 0 ? "paid" : "free";
}

function normalizeUnitAccessType(value) {
  if (["inherit", "free", "paid", "subscription"].includes(value)) return value;
  return "inherit";
}

function normalizeLifecycleStatus(value, fallback = "draft") {
  if (["draft", "published", "archived"].includes(value)) return value;
  return fallback;
}

function normalizeContentType(value) {
  return value === "serial" ? "serial" : "ebook";
}

function normalizeSerialStatus(value, fallback = "ongoing") {
  const status = String(value || fallback).trim().toLowerCase();
  return ["ongoing", "completed", "hiatus"].includes(status) ? status : fallback;
}

function normalizeSerialStatusForContentType(value, contentType) {
  return contentType === "serial" ? normalizeSerialStatus(value) : "completed";
}

function normalizeAgeRating(value) {
  const normalized = String(value || "general").trim().toLowerCase();
  if (["18", "18+", "adult", "mature", "restricted"].includes(normalized)) return "18+";
  if (["15", "15+"].includes(normalized)) return "15+";
  if (["13", "13+"].includes(normalized)) return "13+";
  return "general";
}

function normalizeFlag(value) {
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.toLowerCase()) ? 1 : 0;
  }

  return Number(Boolean(value));
}

async function validateCategoryForContentType(categoryId, contentType) {
  if (!categoryId) return null;
  const [scopeColumns] = await db.query("SHOW COLUMNS FROM categories LIKE 'content_scope'");
  const scopeExpression = scopeColumns.length > 0 ? "content_scope" : "'all'";
  const [rows] = await db.query(
    `SELECT id, name, ${scopeExpression} AS content_scope
     FROM categories
     WHERE id = ?
     LIMIT 1`,
    [categoryId],
  );

  if (rows.length === 0) return "ไม่พบหมวดหมู่ที่เลือก";
  const scope = rows[0].content_scope || "all";
  if (scope === "all" || scope === contentType) return null;
  return contentType === "serial"
    ? "หมวดหมู่นี้ใช้กับหนังสือรายตอนไม่ได้"
    : "หมวดหมู่นี้ใช้กับหนังสือแบบเล่มไม่ได้";
}

async function syncBookAggregates(bookId, connection = db) {
  const [unitStats] = await connection.query(
    `SELECT
       COUNT(*) AS total_units,
       COALESCE(SUM(sentence_count), 0) AS total_sentences,
       COALESCE(SUM(word_count), 0) AS total_words
     FROM book_units
     WHERE book_id = ?`,
    [bookId],
  );

  const [blockStats] = await connection.query(
    `SELECT
       COUNT(*) AS total_blocks,
       COALESCE(SUM(char_count), 0) AS total_characters
     FROM book_unit_blocks bub
     JOIN book_units bu ON bu.id = bub.book_unit_id
     WHERE bu.book_id = ?`,
    [bookId],
  );

  const totalWords = Number(unitStats[0]?.total_words || 0);
  const estimatedReadingMinutes = Math.max(1, Math.ceil(totalWords / 180 || 0));
  const [episodeRows] = await connection.query(
    `SELECT MAX(updated_at) AS latest_episode_at
     FROM book_units
     WHERE book_id = ? AND unit_type = 'episode'`,
    [bookId],
  );

  await connection.query(
    `UPDATE books
     SET total_units = ?,
         total_blocks = ?,
         total_sentences = ?,
         total_words = ?,
         total_characters = ?,
         estimated_reading_minutes = ?,
         latest_episode_at = COALESCE(?, latest_episode_at),
         updated_at = NOW()
     WHERE id = ?`,
    [
      Number(unitStats[0]?.total_units || 0),
      Number(blockStats[0]?.total_blocks || 0),
      Number(unitStats[0]?.total_sentences || 0),
      totalWords,
      Number(blockStats[0]?.total_characters || 0),
      estimatedReadingMinutes,
      episodeRows[0]?.latest_episode_at || null,
      bookId,
    ],
  );
}

async function upsertBookTags(bookId, tags = [], connection = db) {
  const cleanTags = [...new Set(
    (Array.isArray(tags) ? tags : [])
      .map((tag) => String(tag || "").trim())
      .filter(Boolean),
  )];

  try {
    await connection.query("DELETE FROM book_tag_maps WHERE book_id = ?", [bookId]);
  } catch (_) {
    return;
  }

  for (const tagName of cleanTags) {
    await connection.query("INSERT IGNORE INTO book_tags (name) VALUES (?)", [tagName]);
    const [tagRows] = await connection.query(
      "SELECT id FROM book_tags WHERE name = ? LIMIT 1",
      [tagName],
    );
    if (tagRows.length > 0) {
      await connection.query(
        "INSERT IGNORE INTO book_tag_maps (book_id, tag_id) VALUES (?, ?)",
        [bookId, tagRows[0].id],
      );
    }
  }
}

async function replaceUnitContent(bookId, unitId, blocks, connection) {
  const structured = prepareStructuredContent({ bookId, unitId, blocks });

  await connection.query("DELETE FROM book_unit_sentences WHERE book_unit_id = ?", [unitId]);
  await connection.query("DELETE FROM book_unit_blocks WHERE book_unit_id = ?", [unitId]);

  for (const block of structured.blocks) {
    const [result] = await connection.query(
      `INSERT INTO book_unit_blocks
       (book_unit_id, block_order, block_type, display_text, tts_text, speaker_name, char_count, sentence_count, metadata_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        block.book_unit_id,
        block.block_order,
        block.block_type,
        block.display_text,
        block.tts_text,
        block.speaker_name,
        block.char_count,
        block.sentence_count,
        block.metadata_json ? JSON.stringify(block.metadata_json) : null,
      ],
    );

    const blockSentences = structured.sentences.filter(
      (sentence) => sentence.block_order === block.block_order,
    );

    for (const sentence of blockSentences) {
      await connection.query(
        `INSERT INTO book_unit_sentences
         (sentence_uuid, book_id, book_unit_id, block_id, sentence_order, sentence_in_block, display_text, tts_text, plain_text, start_offset, end_offset, duration_ms_estimate, audio_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'none', NOW(), NOW())`,
        [
          sentence.sentence_uuid,
          sentence.book_id,
          sentence.book_unit_id,
          result.insertId,
          sentence.sentence_order,
          sentence.sentence_in_block,
          sentence.display_text,
          sentence.tts_text,
          sentence.plain_text,
          sentence.start_offset,
          sentence.end_offset,
          sentence.duration_ms_estimate,
        ],
      );
    }
  }

  await connection.query(
    `UPDATE book_units
     SET sentence_count = ?, word_count = ?, estimated_reading_minutes = ?, updated_at = NOW()
     WHERE id = ?`,
    [
      structured.stats.total_sentences,
      structured.stats.total_words,
      Math.max(1, Math.ceil(structured.stats.total_words / 180 || 0)),
      unitId,
    ],
  );

  await syncBookAggregates(bookId, connection);

  return structured.stats;
}

router.post("/", verifyToken, uploadCoverFiles, async (req, res) => {
  const connection = await db.getConnection();

  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์สร้างหนังสือ" });
    }

    if (!(await isSystemFeatureEnabled("writer_applications_enabled", true))) {
      return res.status(503).json({ message: "ระบบนักเขียนปิดรับผลงานใหม่ชั่วคราว" });
    }

    const {
      title,
      title_th,
      title_en,
      subtitle = null,
      subtitle_th = null,
      subtitle_en = null,
      author_name,
      description = "",
      category_id = null,
      language_code = "th",
      content_type = "ebook",
      serial_status,
      access_type = "paid",
      price = 0,
      coin_price = 0,
      preview_mode = "percentage",
      preview_value = 10,
      age_rating = null,
      tags = [],
      cover_image = null,
      cover_image_url = null,
      requested_best_seller = false,
      requested_new_release = false,
      requested_promotion = false,
      requested_free_book = false,
      requested_hall_of_fame = false,
      requested_recommended = false,
    } = req.body;

    await ensureCatalogAnalyticsSchema();
    const titleTh = String(title_th || title || "").trim();
    const titleEn = String(title_en || "").trim();
    const subtitleTh = String(subtitle_th || subtitle || "").trim();
    const subtitleEn = String(subtitle_en || "").trim();
    const safeAuthorName = String(author_name || req.user.name || "").trim();
    const safeContentType = normalizeContentType(content_type);
    const categoryError = await validateCategoryForContentType(category_id, safeContentType);
    if (categoryError) {
      return res.status(400).json({ message: categoryError });
    }

    const uploadedCoverFile = getUploadedCoverFile(req);
    const initialCoverImage =
      getCoverImagePath(uploadedCoverFile, cover_image || cover_image_url) ||
      generateBookCoverPath({
        title,
        subtitle: subtitleTh,
        author: safeAuthorName,
        seed: `${titleTh || ""}:${safeAuthorName}:${Date.now()}`,
      });

    if (!titleTh || !titleEn || !safeAuthorName) {
      return res.status(400).json({ message: "กรุณากรอกชื่อหนังสือและผู้เขียน" });
    }

    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO books
       (slug, title, title_th, title_en, subtitle, subtitle_th, subtitle_en, author_name, author, description, cover_image_url, cover_image,
        category_id, language_code, content_type, serial_status, access_type, lifecycle_status, publishing_status,
        price, coin_price, preview_mode, preview_value, age_rating, created_by,
        requested_best_seller, requested_new_release, requested_promotion, requested_free_book,
        requested_hall_of_fame, requested_recommended, approval_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'ready', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [
        slugify(titleTh, `book-${Date.now()}`),
        titleTh,
        titleTh,
        titleEn,
        subtitleTh || null,
        subtitleTh || null,
        subtitleEn || null,
        safeAuthorName,
        safeAuthorName,
        description,
        initialCoverImage,
        initialCoverImage,
        category_id || null,
        language_code || "th",
        safeContentType,
        normalizeSerialStatusForContentType(serial_status, safeContentType),
        normalizeBookAccessType(access_type, price),
        Number(price || 0),
        Number(coin_price || 0),
        ["none", "percentage", "chapter_count", "sentence_count"].includes(preview_mode)
          ? preview_mode
          : "percentage",
        normalizePositiveInt(preview_value, 10),
        normalizeAgeRating(age_rating),
        req.user.id,
        normalizeFlag(requested_best_seller),
        normalizeFlag(requested_new_release),
        normalizeFlag(requested_promotion),
        normalizeFlag(requested_free_book),
        normalizeFlag(requested_hall_of_fame),
        normalizeFlag(requested_recommended),
      ],
    );

    await upsertBookTags(result.insertId, tags, connection);
    await ensureBookCover(
      {
        id: result.insertId,
        title: titleTh,
        subtitle: subtitleTh,
        author: safeAuthorName,
        author_name: safeAuthorName,
        cover_image: initialCoverImage,
        cover_image_url: initialCoverImage,
      },
      connection,
    );
    await connection.commit();

    return res.status(201).json({
      id: result.insertId,
      slug: slugify(titleTh, `book-${result.insertId}`),
      lifecycle_status: "draft",
    });
  } catch (error) {
    await connection.rollback();
    console.error("POST /writer/books error:", error);
    return res.status(500).json({ message: "สร้างหนังสือไม่สำเร็จ" });
  } finally {
    connection.release();
  }
});

router.get("/mine", verifyToken, async (req, res) => {
  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });
    }

    const [rows] = await db.query(
      `SELECT
         b.id,
         b.title,
         b.title_th,
         b.title_en,
         b.subtitle,
         b.subtitle_th,
         b.subtitle_en,
         b.author,
         b.description,
         COALESCE(b.cover_image_url, b.cover_image) AS cover_image,
         COALESCE(b.cover_image_url, b.cover_image) AS cover_image_url,
         b.access_type,
         b.price,
         b.created_at,
         b.updated_at,
         c.name AS category_name
       FROM books b
       LEFT JOIN categories c ON c.id = b.category_id
       WHERE b.created_by = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    await ensureBooksHaveCovers(rows, db);
    return res.json(rows);
  } catch (error) {
    console.error("GET /writer/books/mine error:", error);
    return res.status(500).json({ message: "ดึงหนังสือของฉันไม่สำเร็จ" });
  }
});

router.get("/stats", verifyToken, async (req, res) => {
  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ดูสถิตินักเขียน" });
    }

    const [summaryRows] = await db.query(
      `SELECT
         COUNT(*) AS total_books,
         SUM(CASE WHEN b.is_published = 1 OR b.lifecycle_status = 'published' THEN 1 ELSE 0 END) AS published_books,
         SUM(CASE WHEN COALESCE(b.approval_status, 'pending') = 'pending' THEN 1 ELSE 0 END) AS pending_books,
         SUM(CASE WHEN b.content_type = 'serial' THEN 1 ELSE 0 END) AS serial_books,
         SUM(CASE WHEN b.content_type <> 'serial' OR b.content_type IS NULL THEN 1 ELSE 0 END) AS ebook_books,
         COALESCE(SUM(COALESCE(b.total_units, 0)), 0) AS total_units,
         COALESCE(SUM(COALESCE(b.total_sentences, 0)), 0) AS total_sentences,
         COALESCE(SUM(COALESCE(b.total_words, 0)), 0) AS total_words,
         COALESCE(SUM(COALESCE(b.total_characters, 0)), 0) AS total_characters
       FROM books b
       WHERE b.created_by = ?`,
      [req.user.id],
    );

    const [engagementRows] = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM book_views bv JOIN books b ON b.id = bv.book_id WHERE b.created_by = ?) AS book_views,
         (SELECT COUNT(*) FROM episode_views ev JOIN book_episodes ep ON ep.id = ev.episode_id JOIN books b ON b.id = ep.book_id WHERE b.created_by = ?) AS episode_views,
         (SELECT COUNT(*) FROM book_reviews br JOIN books b ON b.id = br.book_id WHERE b.created_by = ?) AS review_count,
         (SELECT COALESCE(ROUND(AVG(br.rating), 2), 0) FROM book_reviews br JOIN books b ON b.id = br.book_id WHERE b.created_by = ?) AS average_rating,
         (SELECT COUNT(*) FROM library l JOIN books b ON b.id = l.book_id WHERE b.created_by = ?) AS library_count,
         (SELECT COUNT(*)
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          LEFT JOIN books direct_book ON direct_book.id = oi.book_id
          LEFT JOIN book_episodes ep ON ep.id = oi.episode_id
          LEFT JOIN books episode_book ON episode_book.id = ep.book_id
          WHERE o.payment_status = 'paid'
            AND o.order_status = 'completed'
            AND COALESCE(direct_book.created_by, episode_book.created_by) = ?) AS paid_items,
         (SELECT COALESCE(SUM(oi.price), 0)
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          LEFT JOIN books direct_book ON direct_book.id = oi.book_id
          LEFT JOIN book_episodes ep ON ep.id = oi.episode_id
          LEFT JOIN books episode_book ON episode_book.id = ep.book_id
          WHERE o.payment_status = 'paid'
            AND o.order_status = 'completed'
            AND COALESCE(direct_book.created_by, episode_book.created_by) = ?) AS gross_sales`,
      Array(7).fill(req.user.id),
    );

    const [bookRows] = await db.query(
      `SELECT
         b.id,
         b.title,
         b.title_th,
         b.title_en,
         b.content_type,
         b.lifecycle_status,
         b.approval_status,
         b.is_published,
         b.total_units,
         b.total_sentences,
         b.total_words,
         b.updated_at,
         (SELECT COUNT(*) FROM book_views bv WHERE bv.book_id = b.id) AS views,
         (SELECT COUNT(*) FROM book_reviews br WHERE br.book_id = b.id) AS reviews,
         (SELECT COALESCE(ROUND(AVG(br.rating), 2), 0) FROM book_reviews br WHERE br.book_id = b.id) AS average_rating,
         (SELECT COUNT(*)
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          LEFT JOIN book_episodes ep ON ep.id = oi.episode_id
          WHERE o.payment_status = 'paid'
            AND o.order_status = 'completed'
            AND (oi.book_id = b.id OR ep.book_id = b.id)) AS paid_items,
         (SELECT COALESCE(SUM(oi.price), 0)
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          LEFT JOIN book_episodes ep ON ep.id = oi.episode_id
          WHERE o.payment_status = 'paid'
            AND o.order_status = 'completed'
            AND (oi.book_id = b.id OR ep.book_id = b.id)) AS gross_sales
       FROM books b
       WHERE b.created_by = ?
       ORDER BY views DESC, b.updated_at DESC
       LIMIT 20`,
      [req.user.id],
    );

    return res.json({
      summary: {
        ...(summaryRows[0] || {}),
        ...(engagementRows[0] || {}),
      },
      books: bookRows,
    });
  } catch (error) {
    console.error("GET /writer/books/stats error:", error);
    return res.status(500).json({ message: "โหลดสถิตินักเขียนไม่สำเร็จ" });
  }
});

router.put("/:id", verifyToken, uploadCoverFiles, async (req, res) => {
  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์แก้ไขหนังสือ" });
    }

    const bookId = req.params.id;
    const ok = await ensureBookOwner(bookId, req.user);
    if (!ok) {
      return res.status(403).json({
        message: "คุณไม่มีสิทธิ์แก้ไขหนังสือเล่มนี้",
      });
    }

    const {
      title,
      title_th,
      title_en,
      subtitle,
      subtitle_th,
      subtitle_en,
      author,
      author_name,
      description,
      category_id,
      cover_image,
      cover_image_url,
      access_type,
      price,
      age_rating,
      tags,
      requested_best_seller,
      requested_new_release,
      requested_promotion,
      requested_free_book,
      requested_hall_of_fame,
      requested_recommended,
    } = req.body;
    await ensureCatalogAnalyticsSchema();
    const titleTh = String(title_th || title || "").trim();
    const titleEn = String(title_en || "").trim();
    const subtitleTh = String(subtitle_th || subtitle || "").trim();
    const subtitleEn = String(subtitle_en || "").trim();
    const [bookRows] = await db.query(
      "SELECT id, content_type, category_id, age_rating FROM books WHERE id = ? LIMIT 1",
      [bookId],
    );
    const existingBook = bookRows[0] || {};
    const categoryError = await validateCategoryForContentType(
      category_id || existingBook.category_id,
      normalizeContentType(existingBook.content_type),
    );
    if (categoryError) {
      return res.status(400).json({ message: categoryError });
    }

    const uploadedCoverFile = getUploadedCoverFile(req);
    const requestedCoverImage = getCoverImagePath(
      uploadedCoverFile,
      cover_image || cover_image_url,
    );
    const nextCoverImage = requestedCoverImage || null;

    await db.query(
      `UPDATE books
       SET title = ?,
           title_th = ?,
           title_en = ?,
           subtitle = ?,
           subtitle_th = ?,
           subtitle_en = ?,
           author = COALESCE(?, author),
           author_name = COALESCE(?, author_name),
           description = ?,
           category_id = ?,
           cover_image = COALESCE(?, cover_image),
           cover_image_url = COALESCE(?, cover_image_url),
           access_type = ?,
           price = ?,
           age_rating = ?,
           requested_best_seller = COALESCE(?, requested_best_seller),
           requested_new_release = COALESCE(?, requested_new_release),
           requested_promotion = COALESCE(?, requested_promotion),
           requested_free_book = COALESCE(?, requested_free_book),
           requested_hall_of_fame = COALESCE(?, requested_hall_of_fame),
           requested_recommended = COALESCE(?, requested_recommended),
           updated_at = NOW()
       WHERE id = ?`,
      [
        titleTh,
        titleTh,
        titleEn,
        subtitleTh || null,
        subtitleTh || null,
        subtitleEn || null,
        author || null,
        author_name || author || null,
        description || null,
        category_id || null,
        nextCoverImage,
        nextCoverImage,
        access_type || "free",
        Number(price || 0),
        age_rating === undefined ? existingBook.age_rating : normalizeAgeRating(age_rating),
        requested_best_seller === undefined ? null : normalizeFlag(requested_best_seller),
        requested_new_release === undefined ? null : normalizeFlag(requested_new_release),
        requested_promotion === undefined ? null : normalizeFlag(requested_promotion),
        requested_free_book === undefined ? null : normalizeFlag(requested_free_book),
        requested_hall_of_fame === undefined ? null : normalizeFlag(requested_hall_of_fame),
        requested_recommended === undefined ? null : normalizeFlag(requested_recommended),
        bookId,
      ]
    );

    const [updatedRows] = await db.query(
      `SELECT id, title, title_th, title_en, subtitle, subtitle_th, subtitle_en, author, author_name, description, cover_image, cover_image_url
       FROM books
       WHERE id = ?
       LIMIT 1`,
      [bookId],
    );

    if (updatedRows.length > 0) {
      await ensureBookCover(updatedRows[0], db);
    }

    if (tags !== undefined) {
      await upsertBookTags(bookId, tags);
    }

    return res.json({ message: "แก้ไขหนังสือสำเร็จ" });
  } catch (error) {
    console.error("PUT /writer/books/:id error:", error);
    return res.status(500).json({ message: "แก้ไขหนังสือไม่สำเร็จ" });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ลบหนังสือ" });
    }

    const bookId = req.params.id;
    const ok = await ensureBookOwner(bookId, req.user);
    if (!ok) {
      return res.status(403).json({
        message: "คุณไม่มีสิทธิ์ลบหนังสือเล่มนี้",
      });
    }

    await db.query("DELETE FROM books WHERE id = ?", [bookId]);

    return res.json({ message: "ลบหนังสือสำเร็จ" });
  } catch (error) {
    console.error("DELETE /writer/books/:id error:", error);
    return res.status(500).json({ message: "ลบหนังสือไม่สำเร็จ" });
  }
});

router.get("/:bookId/episodes", verifyToken, async (req, res) => {
  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });
    }

    const ok = await ensureBookOwner(req.params.bookId, req.user);
    if (!ok) {
      return res.status(403).json({
        message: "คุณไม่มีสิทธิ์ดูตอนของหนังสือนี้",
      });
    }

    const [rows] = await db.query(
      `SELECT id, book_id, title, title_th, title_en, episode_number, access_type, price, created_at, updated_at
       FROM book_episodes
       WHERE book_id = ?
       ORDER BY episode_number ASC, id ASC`,
      [req.params.bookId]
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /writer/books/:bookId/episodes error:", error);
    return res.status(500).json({ message: "ดึงรายการตอนไม่สำเร็จ" });
  }
});

router.post("/:bookId/units", verifyToken, async (req, res) => {
  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เพิ่มบทหรือตอน" });
    }

    const bookId = Number(req.params.bookId);
    const ok = await ensureBookOwner(bookId, req.user);
    if (!ok) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์แก้ไขหนังสือเล่มนี้" });
    }

    const {
      unit_type,
      unit_number,
      title,
      short_title = null,
      summary = null,
      access_type = "inherit",
      price = 0,
      coin_price = 0,
      is_preview = false,
      lifecycle_status = "draft",
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "กรุณากรอกชื่อบทหรือตอน" });
    }

    const safeUnitType = unit_type === "episode" ? "episode" : "chapter";
    const safeUnitNumber = normalizePositiveInt(unit_number, 1);

    const [result] = await db.query(
      `INSERT INTO book_units
       (book_id, unit_type, unit_number, slug, title, short_title, summary, access_type, price, coin_price, is_preview, lifecycle_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        bookId,
        safeUnitType,
        safeUnitNumber,
        slugify(`${safeUnitNumber}-${title}`, `unit-${Date.now()}`),
        title,
        short_title,
        summary,
        normalizeUnitAccessType(access_type),
        Number(price || 0),
        Number(coin_price || 0),
        Number(Boolean(is_preview)),
        normalizeLifecycleStatus(lifecycle_status),
      ],
    );

    await syncBookAggregates(bookId);

    return res.status(201).json({
      id: result.insertId,
      unit_number: safeUnitNumber,
      unit_type: safeUnitType,
      title,
    });
  } catch (error) {
    console.error("POST /writer/books/:bookId/units error:", error);
    return res.status(500).json({ message: "เพิ่มบทหรือตอนไม่สำเร็จ" });
  }
});

router.put("/:bookId/units/:unitId", verifyToken, async (req, res) => {
  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์แก้ไขบทหรือตอน" });
    }

    const bookId = Number(req.params.bookId);
    const unitId = Number(req.params.unitId);
    const ok = await ensureBookOwner(bookId, req.user);
    if (!ok) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์แก้ไขหนังสือเล่มนี้" });
    }

    const {
      title,
      short_title,
      summary,
      unit_number,
      access_type,
      price,
      coin_price,
      is_preview,
      lifecycle_status,
    } = req.body;

    await db.query(
      `UPDATE book_units
       SET title = COALESCE(?, title),
           short_title = COALESCE(?, short_title),
           summary = COALESCE(?, summary),
           unit_number = COALESCE(?, unit_number),
           access_type = COALESCE(?, access_type),
           price = COALESCE(?, price),
           coin_price = COALESCE(?, coin_price),
           is_preview = COALESCE(?, is_preview),
           lifecycle_status = COALESCE(?, lifecycle_status),
           updated_at = NOW()
       WHERE id = ? AND book_id = ?`,
      [
        title || null,
        short_title || null,
        summary || null,
        unit_number ? normalizePositiveInt(unit_number, 1) : null,
        access_type ? normalizeUnitAccessType(access_type) : null,
        price === undefined ? null : Number(price || 0),
        coin_price === undefined ? null : Number(coin_price || 0),
        is_preview === undefined ? null : Number(Boolean(is_preview)),
        lifecycle_status ? normalizeLifecycleStatus(lifecycle_status) : null,
        unitId,
        bookId,
      ],
    );

    await syncBookAggregates(bookId);
    return res.json({ message: "อัปเดตบทหรือตอนสำเร็จ" });
  } catch (error) {
    console.error("PUT /writer/books/:bookId/units/:unitId error:", error);
    return res.status(500).json({ message: "อัปเดตบทหรือตอนไม่สำเร็จ" });
  }
});

router.post("/:bookId/units/:unitId/import-text", verifyToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์แก้ไขเนื้อหา" });
    }

    const bookId = Number(req.params.bookId);
    const unitId = Number(req.params.unitId);
    const ok = await ensureBookOwner(bookId, req.user);
    if (!ok) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์แก้ไขหนังสือเล่มนี้" });
    }

    const { raw_text = "", preferred_type = "paragraph" } = req.body;
    const blocks = buildBlocksFromRawText(raw_text, preferred_type);

    await connection.beginTransaction();
    const stats = await replaceUnitContent(bookId, unitId, blocks, connection);
    await connection.commit();

    return res.json({
      unit_id: unitId,
      blocks_created: stats.total_blocks,
      sentences_created: stats.total_sentences,
    });
  } catch (error) {
    await connection.rollback();
    console.error("POST /writer/books/:bookId/units/:unitId/import-text error:", error);
    return res.status(500).json({ message: "นำเข้าข้อความไม่สำเร็จ" });
  } finally {
    connection.release();
  }
});

router.post("/:bookId/units/:unitId/content", verifyToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์แก้ไขเนื้อหา" });
    }

    const bookId = Number(req.params.bookId);
    const unitId = Number(req.params.unitId);
    const ok = await ensureBookOwner(bookId, req.user);
    if (!ok) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์แก้ไขหนังสือเล่มนี้" });
    }

    const blocks = Array.isArray(req.body.content_blocks) ? req.body.content_blocks : [];
    if (blocks.length === 0) {
      return res.status(400).json({ message: "กรุณาระบุ content_blocks" });
    }

    await connection.beginTransaction();
    const stats = await replaceUnitContent(bookId, unitId, blocks, connection);
    await connection.commit();

    return res.json({
      unit_id: unitId,
      blocks_created: stats.total_blocks,
      sentences_created: stats.total_sentences,
    });
  } catch (error) {
    await connection.rollback();
    console.error("POST /writer/books/:bookId/units/:unitId/content error:", error);
    return res.status(500).json({ message: "บันทึกเนื้อหาไม่สำเร็จ" });
  } finally {
    connection.release();
  }
});

router.get("/:bookId/units/:unitId/content", verifyToken, async (req, res) => {
  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ดูเนื้อหา" });
    }

    const bookId = Number(req.params.bookId);
    const unitId = Number(req.params.unitId);
    const ok = await ensureBookOwner(bookId, req.user);
    if (!ok) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ดูหนังสือเล่มนี้" });
    }

    const [unitRows] = await db.query(
      `SELECT *
       FROM book_units
       WHERE id = ? AND book_id = ?
       LIMIT 1`,
      [unitId, bookId],
    );

    if (unitRows.length === 0) {
      return res.status(404).json({ message: "ไม่พบบทหรือตอน" });
    }

    const [blockRows] = await db.query(
      `SELECT id, block_order, block_type, display_text, tts_text, speaker_name, char_count, sentence_count, metadata_json
       FROM book_unit_blocks
       WHERE book_unit_id = ?
       ORDER BY block_order ASC`,
      [unitId],
    );

    const [sentenceRows] = await db.query(
      `SELECT id, block_id, sentence_uuid, sentence_order, sentence_in_block, display_text, tts_text, plain_text, start_offset, end_offset, duration_ms_estimate
       FROM book_unit_sentences
       WHERE book_unit_id = ?
       ORDER BY sentence_order ASC`,
      [unitId],
    );

    const blocks = blockRows.map((block) => ({
      ...block,
      metadata_json:
        typeof block.metadata_json === "string" && block.metadata_json
          ? JSON.parse(block.metadata_json)
          : block.metadata_json,
      sentences: sentenceRows.filter((sentence) => sentence.block_id === block.id),
    }));

    return res.json({
      unit: unitRows[0],
      blocks,
    });
  } catch (error) {
    console.error("GET /writer/books/:bookId/units/:unitId/content error:", error);
    return res.status(500).json({ message: "โหลดเนื้อหาไม่สำเร็จ" });
  }
});

router.post("/:bookId/publish", verifyToken, async (req, res) => {
  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เผยแพร่หนังสือ" });
    }

    const bookId = Number(req.params.bookId);
    const ok = await ensureBookOwner(bookId, req.user);
    if (!ok) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์แก้ไขหนังสือเล่มนี้" });
    }

    const [bookRows] = await db.query("SELECT * FROM books WHERE id = ? LIMIT 1", [bookId]);
    const [unitRows] = await db.query(
      "SELECT COUNT(*) AS total_units, COALESCE(SUM(sentence_count), 0) AS total_sentences FROM book_units WHERE book_id = ?",
      [bookId],
    );
    const book = bookRows[0];
    const totalUnits = Number(unitRows[0]?.total_units || 0);
    const totalSentences = Number(unitRows[0]?.total_sentences || 0);

    if (!book) {
      return res.status(404).json({ message: "ไม่พบหนังสือ" });
    }

    if (!book.title || totalUnits === 0 || totalSentences === 0) {
      return res.status(400).json({
        message: "หนังสือยังไม่พร้อมเผยแพร่ ต้องมีชื่อหนังสือ หน่วยเนื้อหา และประโยคอย่างน้อย 1 รายการ",
      });
    }

    await db.query(
      `UPDATE books
       SET lifecycle_status = 'draft',
           publishing_status = 'ready',
           approval_status = 'pending',
           is_published = 0,
           updated_at = NOW()
       WHERE id = ?`,
      [bookId],
    );

    await db.query(
      `UPDATE book_units
       SET lifecycle_status = 'published',
           published_at = COALESCE(published_at, NOW()),
           updated_at = NOW()
       WHERE book_id = ? AND lifecycle_status = 'draft'`,
      [bookId],
    );

    return res.json({ message: "ส่งหนังสือให้แอดมินอนุมัติแล้ว" });
  } catch (error) {
    console.error("POST /writer/books/:bookId/publish error:", error);
    return res.status(500).json({ message: "เผยแพร่หนังสือไม่สำเร็จ" });
  }
});

router.post("/:bookId/unpublish", verifyToken, async (req, res) => {
  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ยกเลิกเผยแพร่" });
    }

    const bookId = Number(req.params.bookId);
    const ok = await ensureBookOwner(bookId, req.user);
    if (!ok) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์แก้ไขหนังสือเล่มนี้" });
    }

    await db.query(
      `UPDATE books
       SET lifecycle_status = 'draft',
           is_published = 0,
           updated_at = NOW()
       WHERE id = ?`,
      [bookId],
    );

    return res.json({ message: "ย้ายหนังสือกลับเป็น draft แล้ว" });
  } catch (error) {
    console.error("POST /writer/books/:bookId/unpublish error:", error);
    return res.status(500).json({ message: "ยกเลิกเผยแพร่ไม่สำเร็จ" });
  }
});

router.post("/:bookId/episodes", verifyToken, async (req, res) => {
  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์สร้างตอน" });
    }

    const ok = await ensureBookOwner(req.params.bookId, req.user);
    if (!ok) {
      return res.status(403).json({
        message: "คุณไม่มีสิทธิ์เพิ่มตอนในหนังสือนี้",
      });
    }

    const {
      title,
      title_th,
      title_en,
      episode_number,
      content_text,
      content,
      content_th,
      content_en,
      access_type,
      price,
    } = req.body;
    const episodeContent = String(content_th || content_text || content || "").trim();
    const episodeContentEn = String(content_en || "").trim();
    await ensureCatalogAnalyticsSchema();
    const titleTh = String(title_th || title || "").trim();
    const titleEn = String(title_en || "").trim();

    if (!titleTh || !titleEn || !episodeContent) {
      return res.status(400).json({ message: "กรอกข้อมูลตอนให้ครบ" });
    }

    const [result] = await db.query(
      `INSERT INTO book_episodes
       (book_id, title, title_th, title_en, episode_number, content, content_th, content_en, access_type, price, is_free, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        req.params.bookId,
        titleTh,
        titleTh,
        titleEn,
        Number(episode_number || 1),
        episodeContent,
        episodeContent,
        episodeContentEn || null,
        access_type || "free",
        Number(price || 0),
        access_type === "free" || Number(price || 0) <= 0 ? 1 : 0,
      ]
    );

    await notifyWriterFollowersAboutEpisode({
      bookId: Number(req.params.bookId),
      episodeId: result.insertId,
      episodeTitle: titleTh,
    });

    return res.json({
      message: "เพิ่มตอนสำเร็จ",
      id: result.insertId,
    });
  } catch (error) {
    console.error("POST /writer/books/:bookId/episodes error:", error);
    return res.status(500).json({ message: "เพิ่มตอนไม่สำเร็จ" });
  }
});

router.put("/episodes/:episodeId", verifyToken, async (req, res) => {
  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์แก้ไขตอน" });
    }

    const [episodes] = await db.query(
      "SELECT id, book_id FROM book_episodes WHERE id = ? LIMIT 1",
      [req.params.episodeId]
    );

    if (episodes.length === 0) {
      return res.status(404).json({ message: "ไม่พบตอน" });
    }

    const ok = await ensureBookOwner(episodes[0].book_id, req.user);
    if (!ok) {
      return res.status(403).json({
        message: "คุณไม่มีสิทธิ์แก้ไขตอนนี้",
      });
    }

    const { title, title_th, title_en, episode_number, content_text, content, content_th, content_en, access_type, price } =
      req.body;
    const episodeContent = String(content_th || content_text || content || "").trim();
    const episodeContentEn = String(content_en || "").trim();
    await ensureCatalogAnalyticsSchema();
    const titleTh = String(title_th || title || "").trim();
    const titleEn = String(title_en || "").trim();

    await db.query(
      `UPDATE book_episodes
       SET title = ?, title_th = ?, title_en = ?, episode_number = ?, content = ?, content_th = ?, content_en = ?, access_type = ?, price = ?
       WHERE id = ?`,
      [
        titleTh,
        titleTh,
        titleEn,
        Number(episode_number || 1),
        episodeContent,
        episodeContent,
        episodeContentEn || null,
        access_type || "free",
        Number(price || 0),
        req.params.episodeId,
      ]
    );

    return res.json({ message: "แก้ไขตอนสำเร็จ" });
  } catch (error) {
    console.error("PUT /writer/books/episodes/:episodeId error:", error);
    return res.status(500).json({ message: "แก้ไขตอนไม่สำเร็จ" });
  }
});

router.delete("/episodes/:episodeId", verifyToken, async (req, res) => {
  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ลบตอน" });
    }

    const [episodes] = await db.query(
      "SELECT id, book_id FROM book_episodes WHERE id = ? LIMIT 1",
      [req.params.episodeId]
    );

    if (episodes.length === 0) {
      return res.status(404).json({ message: "ไม่พบตอน" });
    }

    const ok = await ensureBookOwner(episodes[0].book_id, req.user);
    if (!ok) {
      return res.status(403).json({
        message: "คุณไม่มีสิทธิ์ลบตอนนี้",
      });
    }

    await db.query("DELETE FROM book_episodes WHERE id = ?", [
      req.params.episodeId,
    ]);

    return res.json({ message: "ลบตอนสำเร็จ" });
  } catch (error) {
    console.error("DELETE /writer/books/episodes/:episodeId error:", error);
    return res.status(500).json({ message: "ลบตอนไม่สำเร็จ" });
  }
});

module.exports = router;
