const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../config/db");
const { parseBookFile } = require("../services/fileParser");
const {
  verifyToken,
  optionalVerifyToken,
  allowRoles,
} = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = express.Router();

const GUEST_PREVIEW_PAGE_LIMIT =
  Number(process.env.GUEST_PREVIEW_PAGE_LIMIT) || 1;
const GUEST_PREVIEW_CHAR_LIMIT =
  Number(process.env.GUEST_PREVIEW_CHAR_LIMIT) || 1500;

const uploadDir = path.join(__dirname, "../uploads/book-files");
const coverUploadDir = path.join(__dirname, "../uploads/book-covers");
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(coverUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === "cover_file") return cb(null, coverUploadDir);
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
    if (file.fieldname === "cover_file") {
      if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext))
        return cb(null, true);
      return cb(new Error("รองรับรูปปกเฉพาะ .jpg .jpeg .png และ .webp"));
    }
    if (file.fieldname === "book_file") {
      if ([".pdf", ".txt", ".json"].includes(ext)) return cb(null, true);
      return cb(new Error("รองรับเฉพาะไฟล์ .pdf .txt และ .json"));
    }
    return cb(null, false); // ← field อื่นๆ skip แทน error
  },
});

function getUploadedFile(req, fieldName) {
  if (req.file && req.file.fieldname === fieldName) return req.file;
  const files = req.files?.[fieldName];
  return Array.isArray(files) ? files[0] : null;
}

function getCoverImagePath(file, fallback = "") {
  if (!file) return fallback;
  return `uploads/book-covers/${file.filename}`;
}

function normalizeAccessType(value, price = 0) {
  if (["free", "paid", "subscription"].includes(value)) return value;
  return Number(price || 0) <= 0 ? "free" : "paid";
}

function normalizeContentType(value) {
  return value === "serial" ? "serial" : "ebook";
}

function normalizePositiveInt(value, fallback) {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0
    ? numberValue
    : fallback;
}

function canManageBook(user, book) {
  if (!user || !book) return false;
  if (["admin", "superadmin"].includes(user.role)) return true;
  return user.role === "writer" && Number(book.created_by) === Number(user.id);
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

async function replaceBookPages(bookId, pages = [], connection = db) {
  await connection.query("DELETE FROM book_pages WHERE book_id = ?", [bookId]);

  for (let i = 0; i < pages.length; i += 1) {
    await connection.query(
      `INSERT INTO book_pages (book_id, page_number, page_text)
       VALUES (?, ?, ?)`,
      [bookId, i + 1, pages[i] || ""],
    );
  }
}

router.get("/", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         b.*,
         c.name AS category_name,
         (
           SELECT COUNT(*)
           FROM book_episodes e
           WHERE e.book_id = b.id AND e.is_published = 1
         ) AS episode_count
       FROM books b
       LEFT JOIN categories c ON c.id = b.category_id
       WHERE b.is_published = 1
       ORDER BY b.created_at DESC`,
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /books error:", error);
    return res.status(500).json({ message: "โหลดรายการหนังสือไม่สำเร็จ" });
  }
});

router.post(
  "/upload",
  verifyToken,
  allowRoles("writer", "admin", "superadmin"),
  upload.fields([
    { name: "book_file", maxCount: 1 },
    { name: "cover_file", maxCount: 1 },
  ]),
  async (req, res) => {
    const connection = await db.getConnection();

    try {
      const bookFile = getUploadedFile(req, "book_file");
      const coverFile = getUploadedFile(req, "cover_file");

      if (!bookFile) {
        return res.status(400).json({ message: "กรุณาอัปโหลดไฟล์หนังสือ" });
      }

      const {
        title,
        author,
        description = "",
        category_id = null,
        cover_image = "",
        price = 0,
        access_type,
        content_type,
        preview_page_limit,
        preview_char_limit,
      } = req.body;

      if (!title || !author) {
        return res
          .status(400)
          .json({ message: "กรอกชื่อหนังสือและผู้แต่งให้ครบ" });
      }

      const parsed = await parseBookFile(
        bookFile.path,
        bookFile.mimetype,
        bookFile.originalname,
      );
      const pages = Array.isArray(parsed.pages) ? parsed.pages : [];
      const fullText = parsed.fullText || pages.join("\n\n");
      const finalCoverImage = getCoverImagePath(coverFile, cover_image);

      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO books
         (title, author, description, category_id, cover_image, source_type, content_type,
          access_type, process_status, full_text, total_pages, is_published, created_by, price,
          preview_page_limit, preview_char_limit, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, 1, ?, ?, ?, ?, NOW(), NOW())`,
        [
          title,
          author,
          description,
          category_id || null,
          finalCoverImage,
          parsed.sourceType ||
            path.extname(bookFile.originalname).replace(".", "") ||
            "file",
          normalizeContentType(content_type),
          normalizeAccessType(access_type, price),
          fullText,
          pages.length,
          req.user.id,
          Number(price || 0),
          normalizePositiveInt(preview_page_limit, GUEST_PREVIEW_PAGE_LIMIT),
          normalizePositiveInt(preview_char_limit, GUEST_PREVIEW_CHAR_LIMIT),
        ],
      );

      await saveBookFile(result.insertId, bookFile, connection);
      await replaceBookPages(result.insertId, pages, connection);
      await connection.commit();

      return res.json({
        message: "อัปโหลดหนังสือสำเร็จ",
        book_id: result.insertId,
        total_pages: pages.length,
      });
    } catch (error) {
      await connection.rollback();
      console.error("POST /books/upload error:", error);
      return res.status(500).json({
        message: "อัปโหลดหนังสือไม่สำเร็จ",
        error: error.message,
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
  async (req, res) => {
    try {
      const {
        title,
        author,
        description = "",
        category_id = null,
        cover_image = "",
        price = 0,
        access_type,
        preview_page_limit,
        preview_char_limit,
      } = req.body;

      if (!title || !author) {
        return res.status(400).json({
          message: "Title and author are required",
        });
      }

      const [result] = await db.query(
        `INSERT INTO books
         (title, author, description, category_id, cover_image, source_type, content_type,
          access_type, process_status, full_text, total_pages, is_published, created_by, price,
          preview_page_limit, preview_char_limit, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'manual', 'serial', ?, 'completed', '', 0, 1, ?, ?, ?, ?, NOW(), NOW())`,
        [
          title,
          author,
          description,
          category_id || null,
          cover_image,
          normalizeAccessType(access_type, price),
          req.user.id,
          Number(price || 0),
          normalizePositiveInt(preview_page_limit, GUEST_PREVIEW_PAGE_LIMIT),
          normalizePositiveInt(preview_char_limit, GUEST_PREVIEW_CHAR_LIMIT),
        ],
      );

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

router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, c.name AS category_name
       FROM books b
       LEFT JOIN categories c ON c.id = b.category_id
       WHERE b.id = ?
       LIMIT 1`,
      [req.params.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบหนังสือ" });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("GET /books/:id error:", error);
    return res.status(500).json({ message: "โหลดข้อมูลหนังสือไม่สำเร็จ" });
  }
});

router.get("/:id/content", optionalVerifyToken, async (req, res) => {
  try {
    const [books] = await db.query("SELECT * FROM books WHERE id = ? LIMIT 1", [
      req.params.id,
    ]);
    const book = books[0];

    if (!book) return res.status(404).json({ message: "ไม่พบหนังสือ" });

    const canRead = await canReadFullBook(req.user, book);

    if (!canRead) {
      const [previewPages] = await db.query(
        `SELECT id, book_id, page_number, page_text AS content, 1 AS is_preview
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

      if (previewPages.length > 0) return res.json(previewPages);

      return res.json({
        preview: true,
        is_preview: true,
        message: "ต้องซื้อหนังสือหรือสมัครแพ็กเกจก่อน",
        content: String(book.full_text || book.content || "").slice(
          0,
          normalizePositiveInt(
            book.preview_char_limit,
            GUEST_PREVIEW_CHAR_LIMIT,
          ),
        ),
      });
    }

    const [pages] = await db.query(
      `SELECT id, book_id, page_number, page_text AS content
       FROM book_pages
       WHERE book_id = ?
       ORDER BY page_number ASC`,
      [book.id],
    );

    return res.json(pages);
  } catch (error) {
    console.error("GET /books/:id/content error:", error);
    return res.status(500).json({ message: "โหลดเนื้อหาหนังสือไม่สำเร็จ" });
  }
});

router.get("/:id/episodes", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         id,
         book_id,
         episode_number,
         title,
         price,
         is_free,
         is_published,
         COALESCE(access_type, IF(is_free = 1 OR price <= 0, 'free', 'paid')) AS access_type,
         created_at,
         updated_at
       FROM book_episodes
       WHERE book_id = ? AND is_published = 1
       ORDER BY episode_number ASC, id ASC`,
      [req.params.id],
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /books/:id/episodes error:", error);
    return res.status(500).json({ message: "โหลดรายการตอนไม่สำเร็จ" });
  }
});

router.post(
  "/:id/episodes",
  verifyToken,
  allowRoles("writer", "admin", "superadmin"),
  async (req, res) => {
    try {
      const {
        title,
        content = "",
        episode_number,
        price = 0,
        is_free = 0,
        access_type,
        preview_char_limit,
      } = req.body;

      if (!title) {
        return res.status(400).json({ message: "กรุณากรอกชื่อตอน" });
      }

      const [bookRows] = await db.query(
        "SELECT * FROM books WHERE id = ? LIMIT 1",
        [req.params.id],
      );
      const book = bookRows[0];

      if (!book) return res.status(404).json({ message: "ไม่พบหนังสือ" });
      if (!canManageBook(req.user, book)) {
        return res.status(403).json({
          message: "แก้ไขได้เฉพาะหนังสือของตัวเอง",
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
         (book_id, episode_number, title, content, price, is_free, access_type, preview_char_limit, is_published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          book.id,
          episodeNumber,
          title,
          content,
          Number(price || 0),
          safeIsFree,
          access_type || (safeIsFree ? "free" : "paid"),
          normalizePositiveInt(preview_char_limit, GUEST_PREVIEW_CHAR_LIMIT),
        ],
      );

      await db.query(
        "UPDATE books SET content_type = 'serial', updated_at = NOW() WHERE id = ?",
        [book.id],
      );

      return res.json({
        message: "เพิ่มตอนสำเร็จ",
        episode_id: result.insertId,
      });
    } catch (error) {
      console.error("POST /books/:id/episodes error:", error);
      return res.status(500).json({ message: "เพิ่มตอนไม่สำเร็จ" });
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

    if (!book) return res.status(404).json({ message: "ไม่พบหนังสือ" });
    if (!canManageBook(req.user, book)) {
      return res.status(403).json({
        message: "คุณไม่มีสิทธิ์แก้ไขหนังสือนี้",
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
      is_published,
    } = req.body;

    await db.query(
      `UPDATE books
       SET title = ?,
           author = ?,
           description = ?,
           category_id = ?,
           cover_image = ?,
           price = ?,
           access_type = ?,
           content_type = ?,
           is_published = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        title || book.title,
        author || book.author,
        description ?? book.description,
        category_id || null,
        cover_image ?? book.cover_image,
        Number(price ?? book.price ?? 0),
        normalizeAccessType(
          access_type || book.access_type,
          price ?? book.price,
        ),
        normalizeContentType(content_type || book.content_type),
        typeof is_published === "number"
          ? is_published
          : Number(book.is_published ?? 1),
        book.id,
      ],
    );

    return res.json({ message: "บันทึกหนังสือสำเร็จ" });
  } catch (error) {
    console.error("PUT /books/:id error:", error);
    return res.status(500).json({ message: "บันทึกหนังสือไม่สำเร็จ" });
  }
});

router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM books WHERE id = ?", [req.params.id]);
    return res.json({ message: "ลบหนังสือสำเร็จ" });
  } catch (error) {
    console.error("DELETE /books/:id error:", error);
    return res.status(500).json({ message: "ลบหนังสือไม่สำเร็จ" });
  }
});

module.exports = router;
