const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../config/db");
const {
  parseBookFile,
  sanitizeBookText,
  splitTextToPages,
} = require("../services/fileParser");
const {
  ensureBookCover,
  ensureBooksHaveCovers,
  getCoverImagePath,
  isMissingCover,
} = require("../services/bookCover");
const { notifyWriterFollowersAboutEpisode } = require("../services/notifications");
const {
  verifyToken,
  optionalVerifyToken,
  allowRoles,
} = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const { ensureCatalogAnalyticsSchema } = require("../services/catalogSchema");
const {
  ensureTtsArchitectureMigrated,
} = require("../services/scripts/migrateTtsArchitecture");

const router = express.Router();

const GUEST_PREVIEW_PAGE_LIMIT =
  Number(process.env.GUEST_PREVIEW_PAGE_LIMIT) || 1;
const GUEST_PREVIEW_CHAR_LIMIT =
  Number(process.env.GUEST_PREVIEW_CHAR_LIMIT) || 1500;

const uploadDir = path.join(__dirname, "../uploads/book-files");
const coverUploadDir = path.join(__dirname, "../uploads/book-covers");
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(coverUploadDir, { recursive: true });

const bookFileFields = new Set([
  "book_file",
  "book_file_th",
  "book_file_en",
  "file",
  "file_th",
  "file_en",
  "book",
  "book_th",
  "book_en",
  "ebook",
  "ebook_th",
  "ebook_en",
  "pdf",
  "pdf_th",
  "pdf_en",
]);
const bookFileExtensions = new Set([
  ".pdf",
  ".txt",
  ".json",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".bmp",
  ".tif",
  ".tiff",
]);
const coverFileFields = new Set([
  "cover_file",
  "cover",
  "image",
  "cover_image_file",
]);

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (coverFileFields.has(file.fieldname)) return cb(null, coverUploadDir);
    return cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (coverFileFields.has(file.fieldname)) {
      if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext))
        return cb(null, true);
      return cb(new Error("à¸£à¸­à¸‡à¸£à¸±à¸šà¸£à¸¹à¸›à¸›à¸à¹€à¸‰à¸žà¸²à¸° .jpg .jpeg .png à¹à¸¥à¸° .webp"));
    }
    if (bookFileFields.has(file.fieldname)) {
      if (bookFileExtensions.has(ext)) return cb(null, true);
      return cb(new Error("à¸£à¸­à¸‡à¸£à¸±à¸šà¹€à¸‰à¸žà¸²à¸°à¹„à¸Ÿà¸¥à¹Œ .pdf .txt .json à¹à¸¥à¸°à¹„à¸Ÿà¸¥à¹Œà¸ à¸²à¸žà¸ªà¹à¸à¸™"));
    }
    return cb(null, false); // â† field à¸­à¸·à¹ˆà¸™à¹† skip à¹à¸—à¸™ error
  },
});

function nowMs() {
  return Number(process.hrtime.bigint() / 1000000n);
}

function elapsedMs(startMs) {
  return Math.max(0, nowMs() - startMs);
}

function summarizeUploadedFiles(req) {
  const files = Array.isArray(req.files)
    ? req.files
    : Object.values(req.files || {}).flat();

  return files.map((file) => ({
    field: file.fieldname,
    name: file.originalname || file.filename,
    bytes: Number(file.size || 0),
    type: file.mimetype || "application/octet-stream",
  }));
}

let episodeCommentsTableReady;
let writerProfilesTableReady;
let booksColumnsPromise;

async function ensureEpisodeCommentsTable() {
  if (!episodeCommentsTableReady) {
    episodeCommentsTableReady = db
      .query(`
        CREATE TABLE IF NOT EXISTS episode_comments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          episode_id INT NOT NULL,
          comment TEXT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_episode_comments_user_id (user_id),
          INDEX idx_episode_comments_episode_id (episode_id),
          CONSTRAINT fk_episode_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_episode_comments_episode FOREIGN KEY (episode_id) REFERENCES book_episodes(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      .then(() => true);
  }

  return episodeCommentsTableReady;
}

async function ensureWriterProfilesTable() {
  if (!writerProfilesTableReady) {
    writerProfilesTableReady = db
      .query(`
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
      `)
      .then(() => true);
  }

  return writerProfilesTableReady;
}

async function getBooksColumns() {
  if (!booksColumnsPromise) {
    booksColumnsPromise = db
      .query(
        `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'books'`,
      )
      .then(([rows]) => new Set(rows.map((row) => row.COLUMN_NAME)))
      .catch((error) => {
        booksColumnsPromise = undefined;
        throw error;
      });
  }

  return booksColumnsPromise;
}

function clearBooksColumnsCache() {
  booksColumnsPromise = undefined;
}

function getBookColumnExpression(columns, columnName, fallbackSql = "NULL") {
  return columns.has(columnName) ? `b.${columnName}` : fallbackSql;
}

async function ensureBooksRouteSchema() {
  try {
    await ensureTtsArchitectureMigrated();
    clearBooksColumnsCache();
  } catch (error) {
    console.error("Books schema compatibility warning:", error.message);
  }

  return getBooksColumns();
}

function uploadBookFiles(req, res, next) {
  const uploadStartedAt = nowMs();

  upload.any()(req, res, (error) => {
    req.uploadTiming = {
      upload_ms: elapsedMs(uploadStartedAt),
      files: summarizeUploadedFiles(req),
    };

    if (!error) return next();

    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "à¹„à¸Ÿà¸¥à¹Œà¹ƒà¸«à¸à¹ˆà¹€à¸à¸´à¸™à¹„à¸›"
        : error.message || "à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹„à¸Ÿà¸¥à¹Œà¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ";

    return res.status(400).json({ message });
  });
}

function getUploadedFile(req, fieldNames) {
  const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
  const files = Array.isArray(req.files)
    ? req.files
    : Object.values(req.files || {}).flat();

  return files.find((file) => names.includes(file.fieldname)) || null;
}

function normalizeAccessType(value, price = 0) {
  if (["free", "paid", "subscription"].includes(value)) return value;
  return Number(price || 0) <= 0 ? "free" : "paid";
}

function normalizeContentType(value) {
  return value === "serial" ? "serial" : "ebook";
}

function pickLocalizedText(row, baseName, locale = "th") {
  const th = sanitizeBookText(row?.[`${baseName}_th`] || row?.[baseName] || "");
  const en = sanitizeBookText(row?.[`${baseName}_en`] || "");
  return locale === "en" ? en || th : th || en;
}

function normalizeContentLocale(value) {
  return String(value || "").trim().toLowerCase().startsWith("en") ? "en" : "th";
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

function normalizeBookTags(tags = []) {
  const values = Array.isArray(tags)
    ? tags
    : String(tags || "")
        .split(",")
        .map((tag) => tag.trim());

  return [...new Set(
    values
      .map((tag) => String(tag || "").trim())
      .filter(Boolean)
      .map((tag) => tag.slice(0, 120)),
  )].slice(0, 20);
}

function getRequestTags(req) {
  return req.body.tags !== undefined ? req.body.tags : req.body["tags[]"];
}

async function upsertBookTags(bookId, tags = [], connection = db) {
  const cleanTags = normalizeBookTags(tags);

  await connection.query("DELETE FROM book_tag_maps WHERE book_id = ?", [bookId]);

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

async function getBookTags(bookId) {
  const [tagRows] = await db.query(
    `SELECT bt.name
     FROM book_tag_maps btm
     JOIN book_tags bt ON bt.id = btm.tag_id
     WHERE btm.book_id = ?
     ORDER BY bt.name ASC`,
    [bookId],
  );
  return tagRows.map((row) => row.name);
}

async function getBookTagsMap(bookIds = []) {
  const cleanIds = [...new Set(bookIds.map(Number).filter(Number.isFinite))];
  if (cleanIds.length === 0) return new Map();

  const placeholders = cleanIds.map(() => "?").join(",");
  const [tagRows] = await db.query(
    `SELECT btm.book_id, bt.name
     FROM book_tag_maps btm
     JOIN book_tags bt ON bt.id = btm.tag_id
     WHERE btm.book_id IN (${placeholders})
     ORDER BY bt.name ASC`,
    cleanIds,
  );

  const tagsMap = new Map();
  for (const row of tagRows) {
    const bookId = Number(row.book_id);
    if (!tagsMap.has(bookId)) tagsMap.set(bookId, []);
    tagsMap.get(bookId).push(row.name);
  }
  return tagsMap;
}

function normalizePositiveInt(value, fallback) {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0
    ? numberValue
    : fallback;
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

  if (rows.length === 0) return "à¹„à¸¡à¹ˆà¸žà¸šà¸«à¸¡à¸§à¸”à¸«à¸¡à¸¹à¹ˆà¸—à¸µà¹ˆà¹€à¸¥à¸·à¸­à¸";
  const scope = rows[0].content_scope || "all";
  if (scope === "all" || scope === contentType) return null;
  return contentType === "serial"
    ? "à¸«à¸¡à¸§à¸”à¸«à¸¡à¸¹à¹ˆà¸™à¸µà¹‰à¹ƒà¸Šà¹‰à¸à¸±à¸šà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸£à¸²à¸¢à¸•à¸­à¸™à¹„à¸¡à¹ˆà¹„à¸”à¹‰"
    : "à¸«à¸¡à¸§à¸”à¸«à¸¡à¸¹à¹ˆà¸™à¸µà¹‰à¹ƒà¸Šà¹‰à¸à¸±à¸šà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹à¸šà¸šà¹€à¸¥à¹ˆà¸¡à¹„à¸¡à¹ˆà¹„à¸”à¹‰";
}

function normalizeFlag(value) {
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.toLowerCase()) ? 1 : 0;
  }

  return Number(Boolean(value));
}

function isActivePromotion(book) {
  const discount = Number(book?.promo_discount_percent || 0);
  if (!Number.isFinite(discount) || discount <= 0) return false;

  const now = Date.now();
  const startAt = book?.promo_start_at ? new Date(book.promo_start_at).getTime() : null;
  const endAt = book?.promo_end_at ? new Date(book.promo_end_at).getTime() : null;

  if (startAt && Number.isFinite(startAt) && startAt > now) return false;
  if (endAt && Number.isFinite(endAt) && endAt < now) return false;
  return true;
}

function normalizeOptionalPublished(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return Number(fallback ?? 1);
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return 1;
    if (["0", "false", "no", "off"].includes(normalized)) return 0;
  }

  return Number(value) === 1 ? 1 : 0;
}

function getPlacementRequestValues(source = {}) {
  return {
    requested_best_seller: normalizeFlag(source.requested_best_seller),
    requested_new_release: normalizeFlag(source.requested_new_release),
    requested_promotion: normalizeFlag(source.requested_promotion),
    requested_free_book: normalizeFlag(source.requested_free_book),
    requested_hall_of_fame: normalizeFlag(source.requested_hall_of_fame),
    requested_recommended: normalizeFlag(source.requested_recommended),
  };
}

function parseMaybeJson(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function normalizeManualChapters(chapters) {
  const source = Array.isArray(chapters) ? chapters : [];

  return source
    .map((chapter, index) => {
      const title = sanitizeBookText(
        chapter?.title || chapter?.chapter || `à¸šà¸—à¸—à¸µà¹ˆ ${index + 1}`,
      );
      const content = sanitizeBookText(
        chapter?.content || chapter?.text || chapter?.body || "",
      );

      return {
        title: title || `à¸šà¸—à¸—à¸µà¹ˆ ${index + 1}`,
        content,
      };
    })
    .filter((chapter) => chapter.title || chapter.content);
}

function buildManualBookContent({ chapters, content }) {
  const normalizedChapters = normalizeManualChapters(chapters);

  if (normalizedChapters.length > 0) {
    const fullText = sanitizeBookText(
      normalizedChapters
        .map((chapter) => [chapter.title, chapter.content].filter(Boolean).join("\n\n"))
        .join("\n\n"),
    );

    return {
      fullText,
      pages: splitTextToPages(fullText),
    };
  }

  const fullText = sanitizeBookText(content || "");
  return {
    fullText,
    pages: splitTextToPages(fullText),
  };
}

function pairLocalizedPages(thPages = [], enPages = []) {
  const maxLength = Math.max(thPages.length, enPages.length);
  return Array.from({ length: maxLength }, (_, index) => {
    const th = sanitizeBookText(thPages[index] || "");
    const en = sanitizeBookText(enPages[index] || "");
    return {
      page_text: th || en,
      page_text_th: th || en,
      page_text_en: en || null,
    };
  }).filter((page) => page.page_text || page.page_text_en);
}

async function createBookFromPayload(payload = {}, user, coverFile = null) {
  await ensureCatalogAnalyticsSchema();

  const {
    title,
    title_th,
    title_en,
    subtitle,
    subtitle_th,
    subtitle_en,
    author,
    description = "",
    category_id = null,
    cover_image = "",
    price = 0,
    access_type,
    content_type,
    serial_status,
    preview_page_limit,
    preview_char_limit,
    chapters,
    content = "",
    content_th = "",
    content_en = "",
  } = payload;

  const titleTh = String(title_th || title || "").trim();
  const titleEn = String(title_en || "").trim();
  const subtitleTh = String(subtitle_th || subtitle || "").trim();
  const subtitleEn = String(subtitle_en || "").trim();
  const canonicalTitle = titleTh;

  if (!titleTh || !titleEn || !author) {
    return {
      status: 400,
      body: { message: "à¸à¸£à¸­à¸à¸Šà¸·à¹ˆà¸­à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸ à¸²à¸©à¸²à¹„à¸—à¸¢ à¸ à¸²à¸©à¸²à¸­à¸±à¸‡à¸à¸¤à¸© à¹à¸¥à¸°à¸œà¸¹à¹‰à¹€à¸‚à¸µà¸¢à¸™à¹ƒà¸«à¹‰à¸„à¸£à¸š" },
    };
  }

  const normalizedContentType = normalizeContentType(content_type);
  const normalizedSerialStatus = normalizeSerialStatusForContentType(serial_status, normalizedContentType);
  const categoryError = await validateCategoryForContentType(category_id, normalizedContentType);
  if (categoryError) {
    return {
      status: 400,
      body: { message: categoryError },
    };
  }

  const requestedPlacements = getPlacementRequestValues(payload);
  const autoApprove = ["admin", "superadmin"].includes(user.role);

  if (normalizedContentType === "serial") {
    const initialCoverImage = getCoverImagePath(coverFile, cover_image);
    const [result] = await db.query(
      `INSERT INTO books
       (title, title_th, title_en, subtitle, subtitle_th, subtitle_en, author, description, category_id, cover_image, source_type, content_type,
        serial_status, access_type, process_status, full_text, total_pages, is_published, created_by, price,
        preview_page_limit, preview_char_limit, approval_status, approved_by, approved_at,
        requested_best_seller, requested_new_release, requested_promotion, requested_free_book,
        requested_hall_of_fame, requested_recommended, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', 'serial', ?, ?, 'completed', '', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        canonicalTitle,
        titleTh,
        titleEn,
        subtitleTh || null,
        subtitleTh || null,
        subtitleEn || null,
        author,
        description,
        category_id || null,
        initialCoverImage,
        normalizedSerialStatus,
        normalizeAccessType(access_type, price),
        autoApprove ? 1 : 0,
        user.id,
        Number(price || 0),
        normalizePositiveInt(preview_page_limit, GUEST_PREVIEW_PAGE_LIMIT),
        normalizePositiveInt(preview_char_limit, GUEST_PREVIEW_CHAR_LIMIT),
        autoApprove ? "approved" : "pending",
        autoApprove ? user.id : null,
        autoApprove ? new Date() : null,
        requestedPlacements.requested_best_seller,
        requestedPlacements.requested_new_release,
        requestedPlacements.requested_promotion,
        requestedPlacements.requested_free_book,
        requestedPlacements.requested_hall_of_fame,
        requestedPlacements.requested_recommended,
      ],
    );

    if (isMissingCover(initialCoverImage)) {
      await ensureBookCover(
        {
          id: result.insertId,
          title: canonicalTitle,
          subtitle: subtitleTh,
          author,
          author_name: payload.author_name || author,
          cover_image: initialCoverImage,
          cover_image_url: "",
        },
        db,
      );
    }

    return {
      status: 201,
      body: {
        message: "à¸ªà¸£à¹‰à¸²à¸‡à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹à¸šà¸šà¸£à¸²à¸¢à¸•à¸­à¸™à¸ªà¸³à¹€à¸£à¹‡à¸ˆ",
        book_id: result.insertId,
      },
    };
  }

  const { fullText, pages } = buildManualBookContent({
    chapters: parseMaybeJson(chapters, []),
    content: content_th || content,
  });
  const englishContent = buildManualBookContent({
    chapters: [],
    content: content_en,
  });

  if (!fullText) {
    return {
      status: 400,
      body: { message: "à¸à¸£à¸­à¸à¹€à¸™à¸·à¹‰à¸­à¸«à¸²à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸­à¸¢à¹ˆà¸²à¸‡à¸™à¹‰à¸­à¸¢ 1 à¸šà¸—à¸«à¸£à¸·à¸­ 1 à¸¢à¹ˆà¸­à¸«à¸™à¹‰à¸²" },
    };
  }

  const initialCoverImage = getCoverImagePath(coverFile, cover_image);
  const [result] = await db.query(
    `INSERT INTO books
     (title, title_th, title_en, subtitle, subtitle_th, subtitle_en, author, description, category_id, cover_image, source_type, content_type,
      serial_status, access_type, process_status, full_text, full_text_th, full_text_en, total_pages, is_published, created_by, price,
      preview_page_limit, preview_char_limit, approval_status, approved_by, approved_at,
      requested_best_seller, requested_new_release, requested_promotion, requested_free_book,
      requested_hall_of_fame, requested_recommended, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', 'ebook', 'completed', ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      canonicalTitle,
      titleTh,
      titleEn,
      subtitleTh || null,
      subtitleTh || null,
      subtitleEn || null,
      author,
      description,
      category_id || null,
      initialCoverImage,
      normalizeAccessType(access_type, price),
      fullText,
      fullText,
      englishContent.fullText || null,
      pages.length,
      autoApprove ? 1 : 0,
      user.id,
      Number(price || 0),
      normalizePositiveInt(preview_page_limit, GUEST_PREVIEW_PAGE_LIMIT),
      normalizePositiveInt(preview_char_limit, GUEST_PREVIEW_CHAR_LIMIT),
      autoApprove ? "approved" : "pending",
      autoApprove ? user.id : null,
      autoApprove ? new Date() : null,
      requestedPlacements.requested_best_seller,
      requestedPlacements.requested_new_release,
      requestedPlacements.requested_promotion,
      requestedPlacements.requested_free_book,
      requestedPlacements.requested_hall_of_fame,
      requestedPlacements.requested_recommended,
    ],
  );

  await replaceBookPages(
    result.insertId,
    pages,
    db,
    pairLocalizedPages(pages, englishContent.pages),
  );
  if (isMissingCover(initialCoverImage)) {
    await ensureBookCover(
      {
        id: result.insertId,
        title: canonicalTitle,
        subtitle: subtitleTh,
        author,
        author_name: payload.author_name || author,
        cover_image: initialCoverImage,
        cover_image_url: "",
      },
      db,
    );
  }

  return {
    status: 201,
    body: {
      message: "à¸ªà¸£à¹‰à¸²à¸‡à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹à¸šà¸šà¸à¸£à¸­à¸à¹€à¸™à¸·à¹‰à¸­à¸«à¸²à¸ªà¸³à¹€à¸£à¹‡à¸ˆ",
      book_id: result.insertId,
      total_pages: pages.length,
    },
  };
}

function canManageBook(user, book) {
  if (!user || !book) return false;
  if (["admin", "superadmin"].includes(user.role)) return true;
  return ["user", "writer"].includes(user.role) && Number(book.created_by) === Number(user.id);
}

async function hasPurchasedBook(userId, bookId) {
  if (!userId) return false;

  const [rows] = await db.query(
    `SELECT oi.id
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
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
  if (!userId) return false;

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

async function canReadFullBook(user, book) {
  if (!book) return false;
  if (book.access_type === "free") return true;
  if (!user) return false;
  if (canManageBook(user, book)) return true;
  if (book.access_type === "subscription")
    return hasActiveSubscription(user.id);
  return hasPurchasedBook(user.id, book.id);
}

async function saveBookFile(bookId, file, connection = db) {
  await connection.query(
    "UPDATE book_files SET is_primary = 0 WHERE book_id = ?",
    [bookId],
  );

  await connection.query(
    `INSERT INTO book_files
     (book_id, original_filename, stored_filename, file_path, file_ext, mime_type, file_size, is_primary, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
    [
      bookId,
      file.originalname || file.filename,
      file.filename,
      file.path.replace(/\\/g, "/"),
      path.extname(file.originalname || file.filename).toLowerCase(),
      file.mimetype || "application/octet-stream",
      file.size || 0,
    ],
  );
}

async function replaceBookPages(bookId, pages = [], connection = db, localizedPages = null) {
  await connection.query("DELETE FROM book_pages WHERE book_id = ?", [bookId]);

  const pageRows = Array.isArray(localizedPages)
    ? localizedPages
    : pages.map((page) => ({
        page_text: page || "",
        page_text_th: page || "",
        page_text_en: null,
      }));

  for (let i = 0; i < pageRows.length; i += 1) {
    const page = pageRows[i] || {};
    await connection.query(
      `INSERT INTO book_pages (book_id, page_number, page_text, page_text_th, page_text_en)
       VALUES (?, ?, ?, ?, ?)`,
      [
        bookId,
        i + 1,
        page.page_text || page.page_text_th || "",
        page.page_text_th || page.page_text || "",
        page.page_text_en || null,
      ],
    );
  }
}

function toPublicBookSummary(book) {
  const activePromotion = isActivePromotion(book);
  const activePromoDiscount = activePromotion ? Number(book.promo_discount_percent || 0) : 0;

  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    title_th: book.title_th || book.title,
    title_en: book.title_en || "",
    subtitle: book.subtitle,
    subtitle_th: book.subtitle_th || book.subtitle || "",
    subtitle_en: book.subtitle_en || "",
    author: book.author,
    author_name: book.author_name,
    author_id: book.author_id,
    writer_page_slug: book.writer_page_slug || "",
    description: book.description,
    category_id: book.category_id,
    category_name: book.category_name,
    language_code: book.language_code,
    cover_image: book.cover_image_url || book.cover_image || "",
    cover_image_url: book.cover_image_url || book.cover_image || "",
    source_type: book.source_type,
    content_type: book.content_type,
    serial_status: book.content_type === "serial" ? book.serial_status || "ongoing" : null,
    latest_episode_at: book.latest_episode_at || book.computed_latest_episode_at || null,
    access_type: book.access_type,
    lifecycle_status: book.lifecycle_status,
    publishing_status: book.publishing_status,
    process_status: book.process_status,
    total_pages: book.total_pages,
    is_published: book.is_published,
    created_by: book.created_by,
    price: book.price,
    coin_price: book.coin_price,
    promo_discount_percent: activePromoDiscount,
    active_promo_discount_percent: activePromoDiscount,
    promo_start_at: book.promo_start_at,
    promo_end_at: book.promo_end_at,
    promo_days_left: activePromotion ? Number(book.promo_days_left || 0) : 0,
    preview_mode: book.preview_mode,
    preview_value: book.preview_value,
    age_rating: book.age_rating,
    approval_status: book.approval_status,
    requested_best_seller: book.requested_best_seller,
    requested_new_release: book.requested_new_release,
    requested_promotion: book.requested_promotion,
    requested_free_book: book.requested_free_book,
    requested_hall_of_fame: book.requested_hall_of_fame,
    requested_recommended: book.requested_recommended,
    is_best_seller: book.is_best_seller,
    is_new_release: book.is_new_release,
    is_promotion: book.is_promotion,
    is_free_book: book.is_free_book,
    is_hall_of_fame: book.is_hall_of_fame,
    is_recommended: book.is_recommended,
    preview_page_limit: book.preview_page_limit,
    preview_char_limit: book.preview_char_limit,
    created_at: book.created_at,
    updated_at: book.updated_at,
    episode_count: book.episode_count,
    tags: Array.isArray(book.tags) ? book.tags : normalizeBookTags(book.tags),
    review_count: Number(book.review_count || 0),
    average_rating: Number(book.average_rating || 0),
    read_count: Number(book.read_count || 0),
    view_count: Number(book.read_count || 0),
  };
}

function toPublicBookDetail(book, options = {}) {
  const { tags = [], access = {} } = options;

  return {
    ...toPublicBookSummary(book),
    total_units: book.total_units,
    total_blocks: book.total_blocks,
    total_sentences: book.total_sentences,
    total_words: book.total_words,
    total_characters: book.total_characters,
    estimated_reading_minutes: book.estimated_reading_minutes,
    approval_note: book.approval_note,
    approved_by: book.approved_by,
    approved_at: book.approved_at,
    tags,
    access,
  };
}

router.get("/", async (_req, res) => {
  try {
    await ensureCatalogAnalyticsSchema();
    await ensureWriterProfilesTable();
    const columns = await ensureBooksRouteSchema();

    const [rows] = await db.query(
      `SELECT
         b.id,
         ${getBookColumnExpression(columns, "slug", "NULL")} AS slug,
         b.title,
         ${getBookColumnExpression(columns, "title_th", "b.title")} AS title_th,
         ${getBookColumnExpression(columns, "title_en", "NULL")} AS title_en,
         ${getBookColumnExpression(columns, "subtitle", "NULL")} AS subtitle,
         ${getBookColumnExpression(columns, "subtitle_th", getBookColumnExpression(columns, "subtitle", "NULL"))} AS subtitle_th,
         ${getBookColumnExpression(columns, "subtitle_en", "NULL")} AS subtitle_en,
         b.author,
         ${getBookColumnExpression(columns, "author_name", "NULL")} AS author_name,
         ${getBookColumnExpression(columns, "author_id", "NULL")} AS author_id,
         wp.page_slug AS writer_page_slug,
         b.description,
         b.category_id,
         ${getBookColumnExpression(columns, "language_code", "'th'")} AS language_code,
         b.cover_image,
         ${getBookColumnExpression(columns, "cover_image_url", "NULL")} AS cover_image_url,
         b.source_type,
         b.content_type,
         ${getBookColumnExpression(columns, "serial_status", "NULL")} AS serial_status,
         ${getBookColumnExpression(columns, "latest_episode_at", "NULL")} AS latest_episode_at,
         b.access_type,
         ${getBookColumnExpression(columns, "lifecycle_status", "'published'")} AS lifecycle_status,
         ${getBookColumnExpression(columns, "publishing_status", "'ready'")} AS publishing_status,
         b.process_status,
         b.total_pages,
         b.is_published,
         b.created_by,
         b.price,
         ${getBookColumnExpression(columns, "coin_price", "0")} AS coin_price,
         b.promo_discount_percent,
         b.promo_start_at,
         b.promo_end_at,
         GREATEST(COALESCE(TIMESTAMPDIFF(DAY, NOW(), b.promo_end_at), 0), 0) AS promo_days_left,
         ${getBookColumnExpression(columns, "preview_mode", "'percentage'")} AS preview_mode,
         ${getBookColumnExpression(columns, "preview_value", "10")} AS preview_value,
         ${getBookColumnExpression(columns, "age_rating", "NULL")} AS age_rating,
         ${getBookColumnExpression(columns, "approval_status", "'approved'")} AS approval_status,
         ${getBookColumnExpression(columns, "requested_best_seller", "0")} AS requested_best_seller,
         ${getBookColumnExpression(columns, "requested_new_release", "0")} AS requested_new_release,
         ${getBookColumnExpression(columns, "requested_promotion", "0")} AS requested_promotion,
         ${getBookColumnExpression(columns, "requested_free_book", "0")} AS requested_free_book,
         ${getBookColumnExpression(columns, "requested_hall_of_fame", "0")} AS requested_hall_of_fame,
         ${getBookColumnExpression(columns, "requested_recommended", "0")} AS requested_recommended,
         ${getBookColumnExpression(columns, "is_best_seller", "0")} AS is_best_seller,
         ${getBookColumnExpression(columns, "is_new_release", "0")} AS is_new_release,
         ${getBookColumnExpression(columns, "is_promotion", "0")} AS is_promotion,
         ${getBookColumnExpression(columns, "is_free_book", "0")} AS is_free_book,
         ${getBookColumnExpression(columns, "is_hall_of_fame", "0")} AS is_hall_of_fame,
         ${getBookColumnExpression(columns, "is_recommended", "0")} AS is_recommended,
         ${getBookColumnExpression(columns, "preview_page_limit", String(GUEST_PREVIEW_PAGE_LIMIT))} AS preview_page_limit,
         ${getBookColumnExpression(columns, "preview_char_limit", String(GUEST_PREVIEW_CHAR_LIMIT))} AS preview_char_limit,
         b.created_at,
         b.updated_at,
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
         (
           SELECT COUNT(*)
           FROM book_episodes e
           WHERE e.book_id = b.id AND e.is_published = 1
         ) AS episode_count
       FROM books b
       LEFT JOIN categories c ON c.id = b.category_id
       LEFT JOIN writer_profiles wp ON wp.user_id = b.created_by
       WHERE b.is_published = 1
       ORDER BY b.created_at DESC`,
    );

    await ensureBooksHaveCovers(rows, db);
    const tagsMap = await getBookTagsMap(rows.map((row) => row.id));
    return res.json(
      rows.map((row) =>
        toPublicBookSummary({
          ...row,
          tags: tagsMap.get(Number(row.id)) || [],
        }),
      ),
    );
  } catch (error) {
    console.error("GET /books error:", error);
    return res.status(500).json({ message: "à¹‚à¸«à¸¥à¸”à¸£à¸²à¸¢à¸à¸²à¸£à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ" });
  }
});

router.post(
  "/upload",
  verifyToken,
  allowRoles("writer", "admin", "superadmin"),
  uploadBookFiles,
  async (req, res) => {
    const requestStartedAt = nowMs();
    const connection = await db.getConnection();
    const timings = {
      upload_ms: Number(req.uploadTiming?.upload_ms || 0),
      parse_ms: 0,
      db_ms: 0,
      total_ms: 0,
    };

    try {
      await ensureCatalogAnalyticsSchema();

      const bookFile = getUploadedFile(req, [
        "book_file_th",
        "book_file",
        "file_th",
        "file",
        "book_th",
        "book",
        "ebook_th",
        "ebook",
        "pdf_th",
        "pdf",
      ]);
      const englishBookFile = getUploadedFile(req, [
        "book_file_en",
        "file_en",
        "book_en",
        "ebook_en",
        "pdf_en",
      ]);
      const coverFile = getUploadedFile(req, [...coverFileFields]);

      if (!bookFile) {
        return res.status(400).json({ message: "à¸à¸£à¸¸à¸“à¸²à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¹„à¸Ÿà¸¥à¹Œà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­" });
      }

      const {
        title,
        title_th,
        title_en,
        subtitle,
        subtitle_th,
        subtitle_en,
        author,
        description = "",
        category_id = null,
        cover_image = "",
        price = 0,
        access_type,
        content_type,
        age_rating,
        preview_page_limit,
        preview_char_limit,
      } = req.body;

      const titleTh = String(title_th || title || "").trim();
      const titleEn = String(title_en || "").trim();
      const subtitleTh = String(subtitle_th || subtitle || "").trim();
      const subtitleEn = String(subtitle_en || "").trim();


      if (!titleTh || !titleEn || !author) {
        return res
          .status(400)
          .json({ message: "à¸à¸£à¸­à¸à¸Šà¸·à¹ˆà¸­à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹à¸¥à¸°à¸œà¸¹à¹‰à¹à¸•à¹ˆà¸‡à¹ƒà¸«à¹‰à¸„à¸£à¸š" });
      }

      const normalizedContentType = normalizeContentType(content_type);
      const categoryError = await validateCategoryForContentType(category_id, normalizedContentType);
      if (categoryError) {
        return res.status(400).json({ message: categoryError });
      }

      const parseStartedAt = nowMs();
      const parsed = await parseBookFile(
        bookFile.path,
        bookFile.mimetype,
        bookFile.originalname,
      );
      const parsedEnglish = englishBookFile
        ? await parseBookFile(
            englishBookFile.path,
            englishBookFile.mimetype,
            englishBookFile.originalname,
          )
        : null;
      timings.parse_ms = elapsedMs(parseStartedAt);
      const pages = Array.isArray(parsed.pages)
        ? parsed.pages.map(sanitizeBookText).filter(Boolean)
        : [];
      const englishPages = Array.isArray(parsedEnglish?.pages)
        ? parsedEnglish.pages.map(sanitizeBookText).filter(Boolean)
        : [];
      const fullText = sanitizeBookText(parsed.fullText || pages.join("\n\n"));
      const fullTextEn = sanitizeBookText(parsedEnglish?.fullText || englishPages.join("\n\n"));
      const finalCoverImage = getCoverImagePath(coverFile, cover_image);
      const requestedPlacements = getPlacementRequestValues(req.body);
      const autoApprove = ["admin", "superadmin"].includes(req.user.role);

      const dbStartedAt = nowMs();
      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO books
         (title, title_th, title_en, subtitle, subtitle_th, subtitle_en, author, description, category_id, cover_image, source_type, content_type,
          serial_status, access_type, process_status, full_text, full_text_th, full_text_en, total_pages, is_published, created_by, price,
          preview_page_limit, preview_char_limit, age_rating, approval_status, approved_by, approved_at,
          requested_best_seller, requested_new_release, requested_promotion, requested_free_book,
          requested_hall_of_fame, requested_recommended, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          titleTh,
          titleTh,
          titleEn,
          subtitleTh || null,
          subtitleTh || null,
          subtitleEn || null,
          author,
          description,
          category_id || null,
          finalCoverImage,
          parsed.sourceType ||
            path.extname(bookFile.originalname).replace(".", "") ||
            "file",
          normalizedContentType,
          normalizeSerialStatusForContentType(req.body.serial_status, normalizedContentType),
          normalizeAccessType(access_type, price),
          fullText,
          fullText,
          fullTextEn || null,
          pages.length,
          autoApprove ? 1 : 0,
          req.user.id,
          Number(price || 0),
          normalizePositiveInt(preview_page_limit, GUEST_PREVIEW_PAGE_LIMIT),
          normalizePositiveInt(preview_char_limit, GUEST_PREVIEW_CHAR_LIMIT),
          normalizeAgeRating(age_rating),
          autoApprove ? "approved" : "pending",
          autoApprove ? req.user.id : null,
          autoApprove ? new Date() : null,
          requestedPlacements.requested_best_seller,
          requestedPlacements.requested_new_release,
          requestedPlacements.requested_promotion,
          requestedPlacements.requested_free_book,
          requestedPlacements.requested_hall_of_fame,
          requestedPlacements.requested_recommended,
        ],
      );

      await saveBookFile(result.insertId, bookFile, connection);
      await replaceBookPages(
        result.insertId,
        pages,
        connection,
        pairLocalizedPages(pages, englishPages),
      );
      await upsertBookTags(result.insertId, getRequestTags(req), connection);
      if (isMissingCover(finalCoverImage)) {
        await ensureBookCover(
          {
            id: result.insertId,
            title: titleTh,
            subtitle: subtitleTh,
            author,
            author_name: req.body.author_name || author,
            cover_image: finalCoverImage,
            cover_image_url: "",
          },
          connection,
        );
      }
      await connection.commit();
      timings.db_ms = elapsedMs(dbStartedAt);
      timings.total_ms = timings.upload_ms + elapsedMs(requestStartedAt);

      console.info("POST /books/upload timing", {
        book_id: result.insertId,
        parse_method: parsed.parseMethod || null,
        source_type: parsed.sourceType || null,
        file_bytes: Number(bookFile.size || 0),
        page_count: pages.length,
        ...timings,
      });

      return res.json({
        message: "à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸ªà¸³à¹€à¸£à¹‡à¸ˆ",
        book_id: result.insertId,
        total_pages: pages.length,
        parse_method: parsed.parseMethod || null,
        ocr_quality: parsed.quality || null,
        upload_timing: timings,
      });
    } catch (error) {
      await connection.rollback();
      console.error("POST /books/upload error:", error);
      const statusCode = Number(error.statusCode || error.status || 500);
      const responseMessage =
        statusCode === 400 ? error.message : "à¸­à¸±à¸›à¹‚à¸«à¸¥à¸”à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ";
      return res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
        error: error.message,
        code: error.code,
        message: responseMessage,
      });
    } finally {
      connection.release();
    }
  },
);

router.post(
  "/serial",
  verifyToken,
  allowRoles("writer", "admin", "superadmin"),
  uploadBookFiles,
  async (req, res) => {
    try {
      const coverFile = getUploadedFile(req, [...coverFileFields]);
      await ensureCatalogAnalyticsSchema();
      const {
        title,
        title_th,
        title_en,
        subtitle,
        subtitle_th,
        subtitle_en,
        author,
        description = "",
        category_id = null,
        cover_image = "",
        price = 0,
        access_type,
        age_rating,
        preview_page_limit,
        preview_char_limit,
        tags,
      } = req.body;
      const requestedPlacements = getPlacementRequestValues(req.body);
      const autoApprove = ["admin", "superadmin"].includes(req.user.role);
      const initialCoverImage = getCoverImagePath(coverFile, cover_image);
      const titleTh = String(title_th || title || "").trim();
      const titleEn = String(title_en || "").trim();
      const subtitleTh = String(subtitle_th || subtitle || "").trim();
      const subtitleEn = String(subtitle_en || "").trim();

      if (!titleTh || !titleEn || !author) {
        return res.status(400).json({
          message: "Title Thai, title English, and author are required",
        });
      }

      const [result] = await db.query(
        `INSERT INTO books
         (title, title_th, title_en, subtitle, subtitle_th, subtitle_en, author, description, category_id, cover_image, source_type, content_type,
          serial_status, access_type, process_status, full_text, total_pages, is_published, created_by, price,
          preview_page_limit, preview_char_limit, age_rating, approval_status, approved_by, approved_at,
          requested_best_seller, requested_new_release, requested_promotion, requested_free_book,
          requested_hall_of_fame, requested_recommended, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', 'serial', 'ongoing', ?, 'completed', '', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          titleTh,
          titleTh,
          titleEn,
          subtitleTh || null,
          subtitleTh || null,
          subtitleEn || null,
          author,
          description,
          category_id || null,
          initialCoverImage,
          normalizeAccessType(access_type, price),
          autoApprove ? 1 : 0,
          req.user.id,
          Number(price || 0),
          normalizePositiveInt(preview_page_limit, GUEST_PREVIEW_PAGE_LIMIT),
          normalizePositiveInt(preview_char_limit, GUEST_PREVIEW_CHAR_LIMIT),
          normalizeAgeRating(age_rating),
          autoApprove ? "approved" : "pending",
          autoApprove ? req.user.id : null,
          autoApprove ? new Date() : null,
          requestedPlacements.requested_best_seller,
          requestedPlacements.requested_new_release,
          requestedPlacements.requested_promotion,
          requestedPlacements.requested_free_book,
          requestedPlacements.requested_hall_of_fame,
          requestedPlacements.requested_recommended,
        ],
      );

      if (isMissingCover(initialCoverImage)) {
        await ensureBookCover(
          {
            id: result.insertId,
            title: titleTh,
            subtitle: subtitleTh,
            author,
            author_name: req.body.author_name || author,
            cover_image: initialCoverImage,
            cover_image_url: "",
          },
          db,
        );
      }

      await upsertBookTags(result.insertId, tags);

      return res.json({
        message: "Serial book created successfully",
        book_id: result.insertId,
      });
    } catch (error) {
      console.error("POST /books/serial error:", error);
      return res.status(500).json({ message: "Unable to create serial book" });
    }
  },
);

router.post(
  "/manual",
  verifyToken,
  allowRoles("writer", "admin", "superadmin"),
  uploadBookFiles,
  async (req, res) => {
    try {
      const coverFile = getUploadedFile(req, [...coverFileFields]);
      await ensureCatalogAnalyticsSchema();
      const {
        title,
        title_th,
        title_en,
        subtitle,
        subtitle_th,
        subtitle_en,
        author,
        description = "",
        category_id = null,
        cover_image = "",
        price = 0,
        access_type,
        preview_page_limit,
        preview_char_limit,
        chapters,
        content = "",
        content_th = "",
        content_en = "",
      } = req.body;
      const titleTh = String(title_th || title || "").trim();
      const titleEn = String(title_en || "").trim();
      const subtitleTh = String(subtitle_th || subtitle || "").trim();
      const subtitleEn = String(subtitle_en || subtitle || "").trim();

      if (!titleTh || !titleEn || !author) {
        return res.status(400).json({
          message: "à¸à¸£à¸­à¸à¸Šà¸·à¹ˆà¸­à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹à¸¥à¸°à¸œà¸¹à¹‰à¹€à¸‚à¸µà¸¢à¸™à¹ƒà¸«à¹‰à¸„à¸£à¸š",
        });
      }

      const { fullText, pages } = buildManualBookContent({
        chapters: parseMaybeJson(chapters, []),
        content: content_th || content,
      });
      const englishContent = buildManualBookContent({
        chapters: [],
        content: content_en,
      });
      const requestedPlacements = getPlacementRequestValues(req.body);
      const autoApprove = ["admin", "superadmin"].includes(req.user.role);
      const initialCoverImage = getCoverImagePath(coverFile, cover_image);
      if (!fullText) {
        return res.status(400).json({
          message: "à¸à¸£à¸­à¸à¹€à¸™à¸·à¹‰à¸­à¸«à¸²à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸­à¸¢à¹ˆà¸²à¸‡à¸™à¹‰à¸­à¸¢ 1 à¸šà¸—à¸«à¸£à¸·à¸­ 1 à¸¢à¹ˆà¸­à¸«à¸™à¹‰à¸²",
        });
      }

      const [result] = await db.query(
        `INSERT INTO books
         (title, title_th, title_en, subtitle, subtitle_th, subtitle_en, author, description, category_id, cover_image, source_type, content_type,
          serial_status, access_type, process_status, full_text, full_text_th, full_text_en, total_pages, is_published, created_by, price,
          preview_page_limit, preview_char_limit, approval_status, approved_by, approved_at,
          requested_best_seller, requested_new_release, requested_promotion, requested_free_book,
          requested_hall_of_fame, requested_recommended, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', 'ebook', 'completed', ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          titleTh,
          titleTh,
          titleEn,
          subtitleTh || null,
          subtitleTh || null,
          subtitleEn || null,
          author,
          description,
          category_id || null,
          initialCoverImage,
          normalizeAccessType(access_type, price),
          fullText,
          fullText,
          englishContent.fullText || null,
          pages.length,
          autoApprove ? 1 : 0,
          req.user.id,
          Number(price || 0),
          normalizePositiveInt(preview_page_limit, GUEST_PREVIEW_PAGE_LIMIT),
          normalizePositiveInt(preview_char_limit, GUEST_PREVIEW_CHAR_LIMIT),
          autoApprove ? "approved" : "pending",
          autoApprove ? req.user.id : null,
          autoApprove ? new Date() : null,
          requestedPlacements.requested_best_seller,
          requestedPlacements.requested_new_release,
          requestedPlacements.requested_promotion,
          requestedPlacements.requested_free_book,
          requestedPlacements.requested_hall_of_fame,
          requestedPlacements.requested_recommended,
        ],
      );

      await replaceBookPages(
        result.insertId,
        pages,
        db,
        pairLocalizedPages(pages, englishContent.pages),
      );

      if (isMissingCover(initialCoverImage)) {
        await ensureBookCover(
          {
            id: result.insertId,
            title,
            subtitle: req.body.subtitle,
            author,
            author_name: req.body.author_name || author,
            cover_image: initialCoverImage,
            cover_image_url: "",
          },
          db,
        );
      }

      return res.json({
        message: "à¸ªà¸£à¹‰à¸²à¸‡à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹à¸šà¸šà¸à¸£à¸­à¸à¹€à¸™à¸·à¹‰à¸­à¸«à¸²à¸ªà¸³à¹€à¸£à¹‡à¸ˆ",
        book_id: result.insertId,
        total_pages: pages.length,
      });
    } catch (error) {
      console.error("POST /books/manual error:", error);
      return res.status(500).json({
        message: "à¸ªà¸£à¹‰à¸²à¸‡à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹à¸šà¸šà¸à¸£à¸­à¸à¹€à¸™à¸·à¹‰à¸­à¸«à¸²à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ",
      });
    }
  },
);

router.get("/tags", async (_req, res) => {
  try {
    await ensureBooksRouteSchema();
    const [rows] = await db.query(
      `SELECT
         bt.id,
         bt.name,
         COUNT(btm.book_id) AS book_count
       FROM book_tags bt
       LEFT JOIN book_tag_maps btm ON btm.tag_id = bt.id
       GROUP BY bt.id, bt.name
       ORDER BY book_count DESC, bt.name ASC
       LIMIT 200`,
    );

    return res.json(
      rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
        book_count: Number(row.book_count || 0),
      })),
    );
  } catch (error) {
    console.error("GET /books/tags error:", error);
    return res.status(500).json({ message: "à¹‚à¸«à¸¥à¸”à¹à¸—à¹‡à¸à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ" });
  }
});

router.get("/:id", optionalVerifyToken, async (req, res) => {
  try {
    await ensureCatalogAnalyticsSchema();
    await ensureWriterProfilesTable();
    const columns = await ensureBooksRouteSchema();

    const [rows] = await db.query(
      `SELECT
         b.id,
         ${getBookColumnExpression(columns, "slug", "NULL")} AS slug,
         b.title,
         ${getBookColumnExpression(columns, "title_th", "b.title")} AS title_th,
         ${getBookColumnExpression(columns, "title_en", "NULL")} AS title_en,
         ${getBookColumnExpression(columns, "subtitle", "NULL")} AS subtitle,
         ${getBookColumnExpression(columns, "subtitle_th", getBookColumnExpression(columns, "subtitle", "NULL"))} AS subtitle_th,
         ${getBookColumnExpression(columns, "subtitle_en", "NULL")} AS subtitle_en,
         b.author,
         ${getBookColumnExpression(columns, "author_name", "NULL")} AS author_name,
         ${getBookColumnExpression(columns, "author_id", "NULL")} AS author_id,
         wp.page_slug AS writer_page_slug,
         b.description,
         b.category_id,
         ${getBookColumnExpression(columns, "language_code", "'th'")} AS language_code,
         b.cover_image,
         ${getBookColumnExpression(columns, "cover_image_url", "NULL")} AS cover_image_url,
         b.source_type,
         b.content_type,
         ${getBookColumnExpression(columns, "serial_status", "NULL")} AS serial_status,
         ${getBookColumnExpression(columns, "latest_episode_at", "NULL")} AS latest_episode_at,
         b.access_type,
         ${getBookColumnExpression(columns, "lifecycle_status", "'published'")} AS lifecycle_status,
         ${getBookColumnExpression(columns, "publishing_status", "'ready'")} AS publishing_status,
         b.process_status,
         b.total_pages,
         b.is_published,
         b.created_by,
         b.price,
         ${getBookColumnExpression(columns, "coin_price", "0")} AS coin_price,
         b.promo_discount_percent,
         b.promo_start_at,
         b.promo_end_at,
         GREATEST(COALESCE(TIMESTAMPDIFF(DAY, NOW(), b.promo_end_at), 0), 0) AS promo_days_left,
         ${getBookColumnExpression(columns, "preview_mode", "'percentage'")} AS preview_mode,
         ${getBookColumnExpression(columns, "preview_value", "10")} AS preview_value,
         ${getBookColumnExpression(columns, "total_units", "0")} AS total_units,
         ${getBookColumnExpression(columns, "total_blocks", "0")} AS total_blocks,
         ${getBookColumnExpression(columns, "total_sentences", "0")} AS total_sentences,
         ${getBookColumnExpression(columns, "total_words", "0")} AS total_words,
         ${getBookColumnExpression(columns, "total_characters", "0")} AS total_characters,
         ${getBookColumnExpression(columns, "estimated_reading_minutes", "0")} AS estimated_reading_minutes,
         ${getBookColumnExpression(columns, "age_rating", "NULL")} AS age_rating,
         ${getBookColumnExpression(columns, "approval_status", "'approved'")} AS approval_status,
         ${getBookColumnExpression(columns, "approval_note", "NULL")} AS approval_note,
         ${getBookColumnExpression(columns, "approved_by", "NULL")} AS approved_by,
         ${getBookColumnExpression(columns, "approved_at", "NULL")} AS approved_at,
         ${getBookColumnExpression(columns, "requested_best_seller", "0")} AS requested_best_seller,
         ${getBookColumnExpression(columns, "requested_new_release", "0")} AS requested_new_release,
         ${getBookColumnExpression(columns, "requested_promotion", "0")} AS requested_promotion,
         ${getBookColumnExpression(columns, "requested_free_book", "0")} AS requested_free_book,
         ${getBookColumnExpression(columns, "requested_hall_of_fame", "0")} AS requested_hall_of_fame,
         ${getBookColumnExpression(columns, "requested_recommended", "0")} AS requested_recommended,
         ${getBookColumnExpression(columns, "is_best_seller", "0")} AS is_best_seller,
         ${getBookColumnExpression(columns, "is_new_release", "0")} AS is_new_release,
         ${getBookColumnExpression(columns, "is_promotion", "0")} AS is_promotion,
         ${getBookColumnExpression(columns, "is_free_book", "0")} AS is_free_book,
         ${getBookColumnExpression(columns, "is_hall_of_fame", "0")} AS is_hall_of_fame,
         ${getBookColumnExpression(columns, "is_recommended", "0")} AS is_recommended,
         ${getBookColumnExpression(columns, "preview_page_limit", String(GUEST_PREVIEW_PAGE_LIMIT))} AS preview_page_limit,
         ${getBookColumnExpression(columns, "preview_char_limit", String(GUEST_PREVIEW_CHAR_LIMIT))} AS preview_char_limit,
         b.created_at,
         b.updated_at,
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
         (
           SELECT COUNT(*)
           FROM book_episodes e
           WHERE e.book_id = b.id AND e.is_published = 1
         ) AS episode_count
       FROM books b
       LEFT JOIN categories c ON c.id = b.category_id
       LEFT JOIN writer_profiles wp ON wp.user_id = b.created_by
       WHERE b.id = ?
       LIMIT 1`,
      [req.params.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "à¹„à¸¡à¹ˆà¸žà¸šà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­" });
    }

    const book = rows[0];
    await ensureBookCover(book, db);
    const canReadFull = await canReadFullBook(req.user, book);

    let tags = [];
    try {
      const [tagRows] = await db.query(
        `SELECT bt.name
         FROM book_tag_maps btm
         JOIN book_tags bt ON bt.id = btm.tag_id
         WHERE btm.book_id = ?
         ORDER BY bt.name ASC`,
        [req.params.id],
      );
      tags = tagRows.map((row) => row.name);
    } catch (_) {}

    return res.json(
      toPublicBookDetail(book, {
        tags,
        access: {
          can_read_full: canReadFull,
          requires_purchase: book.access_type === "paid" && !canReadFull,
          requires_subscription:
            book.access_type === "subscription" && !canReadFull,
          preview_page_limit: normalizePositiveInt(
            book.preview_page_limit,
            GUEST_PREVIEW_PAGE_LIMIT,
          ),
          preview_char_limit: normalizePositiveInt(
            book.preview_char_limit,
            GUEST_PREVIEW_CHAR_LIMIT,
          ),
        },
      }),
    );
  } catch (error) {
    console.error("GET /books/:id error:", error);
    return res.status(500).json({ message: "à¹‚à¸«à¸¥à¸”à¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ" });
  }
});

router.post(
  "/",
  verifyToken,
  allowRoles("writer", "admin", "superadmin"),
  async (req, res) => {
    try {
      const result = await createBookFromPayload(req.body, req.user);
      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("POST /books error:", error);
      return res.status(500).json({ message: "à¸ªà¸£à¹‰à¸²à¸‡à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ" });
    }
  },
);

router.get("/:id/toc", optionalVerifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         bu.id,
         bu.unit_type,
         bu.unit_number,
         bu.title,
         bu.is_preview,
         bu.access_type
       FROM book_units bu
       WHERE bu.book_id = ?
         AND bu.lifecycle_status IN ('draft', 'published')
       ORDER BY bu.unit_number ASC, bu.id ASC`,
      [req.params.id],
    );

    return res.json(
      rows.map((row) => ({
        id: row.id,
        unit_type: row.unit_type,
        unit_number: row.unit_number,
        title: row.title,
        is_preview: Number(row.is_preview) === 1,
        is_locked:
          !["free", "inherit"].includes(row.access_type) &&
          Number(row.is_preview) !== 1,
      })),
    );
  } catch (error) {
    console.error("GET /books/:id/toc error:", error);
    return res.status(500).json({ message: "à¹‚à¸«à¸¥à¸”à¸ªà¸²à¸£à¸šà¸±à¸à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ" });
  }
});

router.get("/:id/content", optionalVerifyToken, async (req, res) => {
  try {
    await ensureCatalogAnalyticsSchema();
    const contentLocale = normalizeContentLocale(req.query.locale || req.query.lang);
    const [books] = await db.query("SELECT * FROM books WHERE id = ? LIMIT 1", [
      req.params.id,
    ]);
    const book = books[0];

    if (!book) return res.status(404).json({ message: "à¹„à¸¡à¹ˆà¸žà¸šà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­" });

    const canRead = await canReadFullBook(req.user, book);

    if (!canRead) {
      const [previewPages] = await db.query(
        `SELECT id, book_id, page_number, page_text, page_text_th, page_text_en, 1 AS is_preview
         FROM book_pages
         WHERE book_id = ?
         ORDER BY page_number ASC
         LIMIT ?`,
        [
          book.id,
          normalizePositiveInt(
            book.preview_page_limit,
            GUEST_PREVIEW_PAGE_LIMIT,
          ),
        ],
      );

      if (previewPages.length > 0) {
        return res.json(
          previewPages.map((page) => ({
            ...page,
            content: pickLocalizedText(page, "page_text", contentLocale),
          })),
        );
      }

      return res.json({
        preview: true,
        is_preview: true,
        message: "à¸•à¹‰à¸­à¸‡à¸‹à¸·à¹‰à¸­à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸«à¸£à¸·à¸­à¸ªà¸¡à¸±à¸„à¸£à¹à¸žà¹‡à¸à¹€à¸à¸ˆà¸à¹ˆà¸­à¸™",
        content: pickLocalizedText(book, "full_text", contentLocale).slice(
          0,
          normalizePositiveInt(
            book.preview_char_limit,
            GUEST_PREVIEW_CHAR_LIMIT,
          ),
        ),
      });
    }

    const [pages] = await db.query(
      `SELECT id, book_id, page_number, page_text, page_text_th, page_text_en
       FROM book_pages
       WHERE book_id = ?
       ORDER BY page_number ASC`,
      [book.id],
    );

    return res.json(
      pages.map((page) => ({
        ...page,
        content: pickLocalizedText(page, "page_text", contentLocale),
      })),
    );
  } catch (error) {
    console.error("GET /books/:id/content error:", error);
    return res.status(500).json({ message: "à¹‚à¸«à¸¥à¸”à¹€à¸™à¸·à¹‰à¸­à¸«à¸²à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ" });
  }
});

router.get("/:id/episodes", optionalVerifyToken, async (req, res) => {
  try {
    await ensureCatalogAnalyticsSchema();
    await ensureEpisodeCommentsTable();
    const [rows] = await db.query(
      `SELECT
         id,
         book_id,
         episode_number,
         title,
         title_th,
         title_en,
         price,
         is_free,
         is_published,
         COALESCE(access_type, IF(is_free = 1 OR price <= 0, 'free', 'paid')) AS access_type,
         (
           SELECT COUNT(*)
           FROM episode_comments ec
           WHERE ec.episode_id = book_episodes.id
         ) AS comment_count,
         (
           SELECT COUNT(*)
           FROM episode_views ev
           WHERE ev.episode_id = book_episodes.id
         ) AS read_count,
         ${
           req.user?.id
             ? `EXISTS (
                 SELECT 1
                 FROM episode_views user_ev
                 WHERE user_ev.episode_id = book_episodes.id
                   AND user_ev.user_id = ?
                 LIMIT 1
               )`
             : "0"
         } AS has_read,
         ${
           req.user?.id
             ? `CASE
                 WHEN is_free = 1 OR COALESCE(access_type, IF(is_free = 1 OR price <= 0, 'free', 'paid')) = 'free' THEN 1
                 WHEN EXISTS (
                   SELECT 1
                   FROM books owner_book
                   WHERE owner_book.id = book_episodes.book_id
                     AND (owner_book.created_by = ? OR ? IN ('admin', 'superadmin'))
                   LIMIT 1
                 ) THEN 1
                 WHEN COALESCE(access_type, IF(is_free = 1 OR price <= 0, 'free', 'paid')) = 'paid'
                   AND EXISTS (
                     SELECT 1
                     FROM order_items oi
                     JOIN orders o ON o.id = oi.order_id
                     WHERE o.user_id = ?
                       AND o.payment_status = 'paid'
                       AND o.order_status = 'completed'
                       AND oi.episode_id = book_episodes.id
                     LIMIT 1
                   ) THEN 1
                 WHEN COALESCE(access_type, IF(is_free = 1 OR price <= 0, 'free', 'paid')) = 'subscription'
                   AND EXISTS (
                     SELECT 1
                     FROM user_subscriptions us
                     WHERE us.user_id = ?
                       AND us.status = 'active'
                       AND us.payment_status = 'paid'
                       AND us.end_at > NOW()
                     LIMIT 1
                   ) THEN 1
                 ELSE 0
               END`
             : "IF(is_free = 1 OR COALESCE(access_type, IF(is_free = 1 OR price <= 0, 'free', 'paid')) = 'free', 1, 0)"
         } AS can_read,
         created_at,
         updated_at
       FROM book_episodes
       WHERE book_id = ? AND is_published = 1
       ORDER BY episode_number ASC, id ASC`,
      req.user?.id
        ? [req.user.id, req.user.id, req.user.role, req.user.id, req.user.id, req.params.id]
        : [req.params.id],
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /books/:id/episodes error:", error);
    return res.status(500).json({ message: "à¹‚à¸«à¸¥à¸”à¸£à¸²à¸¢à¸à¸²à¸£à¸•à¸­à¸™à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ" });
  }
});

router.post(
  "/:id/episodes",
  verifyToken,
  allowRoles("writer", "admin", "superadmin"),
  async (req, res) => {
    try {
      await ensureCatalogAnalyticsSchema();

      const {
        title,
        title_th,
        title_en,
        content = "",
        content_th = "",
        content_en = "",
        episode_number,
        price = 0,
        is_free = 0,
        access_type,
        preview_char_limit,
      } = req.body;

      const titleTh = String(title_th || title || "").trim();
      const titleEn = String(title_en || "").trim();
      const contentTh = sanitizeBookText(content_th || content);
      const contentEn = sanitizeBookText(content_en || "");

      if (!titleTh || !titleEn || !contentTh) {
        return res.status(400).json({ message: "à¸à¸£à¸¸à¸“à¸²à¸à¸£à¸­à¸à¸Šà¸·à¹ˆà¸­à¸•à¸­à¸™à¹à¸¥à¸°à¹€à¸™à¸·à¹‰à¸­à¸«à¸²à¸ à¸²à¸©à¸²à¹„à¸—à¸¢" });
      }

      const [bookRows] = await db.query(
        "SELECT * FROM books WHERE id = ? LIMIT 1",
        [req.params.id],
      );
      const book = bookRows[0];

      if (!book) return res.status(404).json({ message: "à¹„à¸¡à¹ˆà¸žà¸šà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­" });
      if (!canManageBook(req.user, book)) {
        return res.status(403).json({
          message: "à¹à¸à¹‰à¹„à¸‚à¹„à¸”à¹‰à¹€à¸‰à¸žà¸²à¸°à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸‚à¸­à¸‡à¸•à¸±à¸§à¹€à¸­à¸‡",
        });
      }

      const requestedEpisodeNumber = Number(episode_number);
      let episodeNumber = requestedEpisodeNumber;

      if (!Number.isInteger(episodeNumber) || episodeNumber <= 0) {
        const [countRows] = await db.query(
          "SELECT COALESCE(MAX(episode_number), 0) AS max_episode FROM book_episodes WHERE book_id = ?",
          [book.id],
        );
        episodeNumber = Number(countRows[0]?.max_episode || 0) + 1;
      }

      const safeIsFree =
        Number(is_free) === 1 || Number(price || 0) <= 0 ? 1 : 0;

      const [result] = await db.query(
        `INSERT INTO book_episodes
         (book_id, episode_number, title, title_th, title_en, content, content_th, content_en, price, is_free, access_type, preview_char_limit, is_published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          book.id,
          episodeNumber,
          titleTh,
          titleTh,
          titleEn,
          contentTh,
          contentTh,
          contentEn || null,
          Number(price || 0),
          safeIsFree,
          access_type || (safeIsFree ? "free" : "paid"),
          normalizePositiveInt(preview_char_limit, GUEST_PREVIEW_CHAR_LIMIT),
        ],
      );

      await db.query(
        `UPDATE books
         SET content_type = 'serial',
             serial_status = CASE
               WHEN content_type = 'serial' AND serial_status IN ('completed', 'hiatus') THEN serial_status
               ELSE 'ongoing'
             END,
             latest_episode_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [book.id],
      );

      await notifyWriterFollowersAboutEpisode({
        bookId: book.id,
        episodeId: result.insertId,
        episodeTitle: titleTh,
      });

      return res.json({
        message: "à¹€à¸žà¸´à¹ˆà¸¡à¸•à¸­à¸™à¸ªà¸³à¹€à¸£à¹‡à¸ˆ",
        episode_id: result.insertId,
      });
    } catch (error) {
      console.error("POST /books/:id/episodes error:", error);
      return res.status(500).json({ message: "à¹€à¸žà¸´à¹ˆà¸¡à¸•à¸­à¸™à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ" });
    }
  },
);

router.put("/:id", verifyToken, async (req, res) => {
  try {
    const [bookRows] = await db.query(
      "SELECT * FROM books WHERE id = ? LIMIT 1",
      [req.params.id],
    );
    const book = bookRows[0];

    if (!book) return res.status(404).json({ message: "à¹„à¸¡à¹ˆà¸žà¸šà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­" });
    if (!canManageBook(req.user, book)) {
      return res.status(403).json({
        message: "à¸„à¸¸à¸“à¹„à¸¡à¹ˆà¸¡à¸µà¸ªà¸´à¸—à¸˜à¸´à¹Œà¹à¸à¹‰à¹„à¸‚à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸™à¸µà¹‰",
      });
    }

    const {
      title,
      author,
      description,
      category_id,
      cover_image,
      price,
      access_type,
      content_type,
      serial_status,
      age_rating,
      tags,
      is_published,
      requested_best_seller,
      requested_new_release,
      requested_promotion,
      requested_free_book,
      requested_hall_of_fame,
      requested_recommended,
    } = req.body;
    const normalizedContentType = normalizeContentType(content_type || book.content_type);
    const categoryError = await validateCategoryForContentType(
      category_id ?? book.category_id,
      normalizedContentType,
    );
    if (categoryError) {
      return res.status(400).json({ message: categoryError });
    }

    await db.query(
      `UPDATE books
       SET title = ?,
           author = ?,
           author_name = ?,
           description = ?,
           category_id = ?,
           cover_image = ?,
           cover_image_url = ?,
           price = ?,
           access_type = ?,
           content_type = ?,
           serial_status = ?,
           latest_episode_at = CASE WHEN ? = 'serial' THEN latest_episode_at ELSE NULL END,
           age_rating = ?,
           is_published = ?,
           requested_best_seller = COALESCE(?, requested_best_seller),
           requested_new_release = COALESCE(?, requested_new_release),
           requested_promotion = COALESCE(?, requested_promotion),
           requested_free_book = COALESCE(?, requested_free_book),
           requested_hall_of_fame = COALESCE(?, requested_hall_of_fame),
           requested_recommended = COALESCE(?, requested_recommended),
           updated_at = NOW()
       WHERE id = ?`,
      [
        title || book.title,
        author || book.author,
        author || book.author_name || book.author,
        description ?? book.description,
        category_id ?? book.category_id,
        cover_image ?? book.cover_image,
        cover_image ?? book.cover_image_url ?? book.cover_image,
        Number(price ?? book.price ?? 0),
        normalizeAccessType(
          access_type || book.access_type,
          price ?? book.price,
        ),
        normalizedContentType,
        normalizeSerialStatusForContentType(serial_status, normalizedContentType),
        normalizedContentType,
        age_rating === undefined ? book.age_rating : normalizeAgeRating(age_rating),
        normalizeOptionalPublished(is_published, book.is_published),
        requested_best_seller === undefined ? null : normalizeFlag(requested_best_seller),
        requested_new_release === undefined ? null : normalizeFlag(requested_new_release),
        requested_promotion === undefined ? null : normalizeFlag(requested_promotion),
        requested_free_book === undefined ? null : normalizeFlag(requested_free_book),
        requested_hall_of_fame === undefined ? null : normalizeFlag(requested_hall_of_fame),
        requested_recommended === undefined ? null : normalizeFlag(requested_recommended),
        book.id,
      ],
    );

    if (tags !== undefined) {
      await upsertBookTags(book.id, tags);
    }

    return res.json({ message: "à¸šà¸±à¸™à¸—à¸¶à¸à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸ªà¸³à¹€à¸£à¹‡à¸ˆ" });
  } catch (error) {
    console.error("PUT /books/:id error:", error);
    return res.status(500).json({ message: "à¸šà¸±à¸™à¸—à¸¶à¸à¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ" });
  }
});

router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM books WHERE id = ?", [req.params.id]);
    return res.json({ message: "à¸¥à¸šà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¸ªà¸³à¹€à¸£à¹‡à¸ˆ" });
  } catch (error) {
    console.error("DELETE /books/:id error:", error);
    return res.status(500).json({ message: "à¸¥à¸šà¸«à¸™à¸±à¸‡à¸ªà¸·à¸­à¹„à¸¡à¹ˆà¸ªà¸³à¹€à¸£à¹‡à¸ˆ" });
  }
});

module.exports = router;
