const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../config/db");
const { parseBookFile } = require("../services/fileParser");
const { verifyToken, allowRoles } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

// ensure upload dir exists
const uploadDir = path.join(__dirname, "../uploads/book-files");
fs.mkdirSync(uploadDir, { recursive: true });

// multer storage
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024,
  },
  fileFilter: function (_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".pdf" || ext === ".txt" || ext === ".json") {
      cb(null, true);
    } else {
      cb(new Error("รองรับเฉพาะไฟล์ .pdf .txt และ .json"));
    }
  },
});

async function replaceBookPages(bookId, pages = [], connection = db) {
  await connection.query("DELETE FROM book_pages WHERE book_id = ?", [bookId]);

  if (!Array.isArray(pages) || pages.length === 0) return;

  for (let i = 0; i < pages.length; i++) {
    await connection.query(
      `
      INSERT INTO book_pages (book_id, page_number, page_text)
      VALUES (?, ?, ?)
      `,
      [bookId, i + 1, pages[i] || ""]
    );
  }
}

async function saveBookFile(bookId, file, connection = db) {
  const normalizedFilePath = file.path.replace(/\\/g, "/");
  const fileExt = path.extname(file.originalname || file.filename).toLowerCase();

  await connection.query("UPDATE book_files SET is_primary = 0 WHERE book_id = ?", [
    bookId,
  ]);

  await connection.query(
    `
    INSERT INTO book_files
    (
      book_id,
      original_filename,
      stored_filename,
      file_path,
      file_ext,
      mime_type,
      file_size,
      is_primary,
      uploaded_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())
    `,
    [
      bookId,
      file.originalname || file.filename,
      file.filename,
      normalizedFilePath,
      fileExt,
      file.mimetype || "application/octet-stream",
      file.size || 0,
    ]
  );
}

// upload + create book
router.post(
  "/upload",
  verifyToken,
  allowRoles("writer", "admin", "superadmin"),
  upload.single("book_file"),
  async (req, res) => {
    const connection = await db.getConnection();

    try {
      if (!req.file) {
        return res.status(400).json({ message: "กรุณาอัปโหลดไฟล์หนังสือ" });
      }

      const { title, author, description, category_id, cover_image } = req.body;

      if (!title || !author) {
        return res.status(400).json({ message: "กรอกข้อมูลหนังสือไม่ครบ" });
      }

      const parsed = await parseBookFile(
        req.file.path,
        req.file.mimetype,
        req.file.originalname
      );
      const pages = Array.isArray(parsed.pages) ? parsed.pages : [];
      const totalPages = pages.length;

      await connection.beginTransaction();

      const [bookResult] = await connection.query(
        `
        INSERT INTO books
        (
          title,
          author,
          description,
          category_id,
          cover_image,
          source_type,
          process_status,
          full_text,
          total_pages,
          is_published,
          created_by,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, 1, ?, NOW(), NOW())
        `,
        [
          title,
          author,
          description || "",
          category_id || null,
          cover_image || "",
          parsed.sourceType || path.extname(req.file.originalname).replace(".", "") || "file",
          parsed.fullText || pages.join("\n\n"),
          totalPages,
          req.user.id,
        ]
      );

      const bookId = bookResult.insertId;
      await saveBookFile(bookId, req.file, connection);
      await replaceBookPages(bookId, pages, connection);
      await connection.commit();

      res.json({
        message: "อัปโหลดหนังสือสำเร็จ",
        book_id: bookId,
        total_pages: totalPages,
      });
    } catch (error) {
      await connection.rollback();
      console.error("POST /books/upload error:", error);
      res.status(500).json({
        message: "อัปโหลดหนังสือไม่สำเร็จ",
        error: error.message,
      });
    } finally {
      connection.release();
    }
  }
);

// get all books
router.get("/", async (_req, res) => {
  try {
    const [books] = await db.query(`
      SELECT
        b.id,
        b.title,
        b.author,
        b.description,
        b.cover_image,
        b.category_id,
        b.total_pages,
        b.is_published,
        b.created_by,
        b.price,
        b.created_at,
        c.name AS category_name
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      ORDER BY b.created_at DESC
    `);

    res.json(books);
  } catch (error) {
    console.error("GET /books error:", error);
    res.status(500).json({ message: "โหลดรายการหนังสือไม่สำเร็จ" });
  }
});

// get single book
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `
      SELECT
        b.id,
        b.title,
        b.author,
        b.description,
        b.cover_image,
        b.category_id,
        b.total_pages,
        b.is_published,
        b.created_by,
        b.price,
        b.created_at,
        c.name AS category_name
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบหนังสือเล่มนี้" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("GET /books/:id error:", error);
    res.status(500).json({ message: "โหลดข้อมูลหนังสือไม่สำเร็จ" });
  }
});

// get book content
router.get("/:id/content", async (req, res) => {
  try {
    const { id } = req.params;

    const [bookRows] = await db.query(
      "SELECT id FROM books WHERE id = ? LIMIT 1",
      [id]
    );

    if (bookRows.length === 0) {
      return res.status(404).json({ message: "ไม่พบหนังสือเล่มนี้" });
    }

    const [pages] = await db.query(
      `
      SELECT id, book_id, page_number, page_text AS content
      FROM book_pages
      WHERE book_id = ?
      ORDER BY page_number ASC
      `,
      [id]
    );

    res.json(pages);
  } catch (error) {
    console.error("GET /books/:id/content error:", error);
    res.status(500).json({ message: "โหลดเนื้อหาหนังสือไม่สำเร็จ" });
  }
});

// update book metadata
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      author,
      description,
      category_id,
      cover_image,
      is_published,
    } = req.body;

    if (!title || !author) {
      return res.status(400).json({ message: "กรอกข้อมูลไม่ครบ" });
    }

    const [exists] = await db.query(
      "SELECT id FROM books WHERE id = ? LIMIT 1",
      [id]
    );

    if (exists.length === 0) {
      return res.status(404).json({ message: "ไม่พบหนังสือที่ต้องการอัปเดต" });
    }

    await db.query(
      `
      UPDATE books
      SET
        title = ?,
        author = ?,
        description = ?,
        category_id = ?,
        cover_image = ?,
        is_published = ?,
        updated_at = NOW()
      WHERE id = ?
      `,
      [
        title,
        author,
        description || "",
        category_id || null,
        cover_image || "",
        typeof is_published === "number" ? is_published : 1,
        id,
      ]
    );

    res.json({ message: "อัปเดตหนังสือสำเร็จ" });
  } catch (error) {
    console.error("PUT /books/:id error:", error);
    res.status(500).json({ message: "อัปเดตหนังสือไม่สำเร็จ" });
  }
});

// replace uploaded content file
router.put(
  "/:id/content",
  verifyToken,
  requireAdmin,
  upload.single("book_file"),
  async (req, res) => {
    const connection = await db.getConnection();

    try {
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({ message: "กรุณาอัปโหลดไฟล์ใหม่" });
      }

      const [bookRows] = await connection.query(
        "SELECT id FROM books WHERE id = ? LIMIT 1",
        [id]
      );

      if (bookRows.length === 0) {
        return res.status(404).json({ message: "ไม่พบหนังสือเล่มนี้" });
      }

      const parsed = await parseBookFile(
        req.file.path,
        req.file.mimetype,
        req.file.originalname
      );
      const pages = Array.isArray(parsed.pages) ? parsed.pages : [];
      const totalPages = pages.length;

      await connection.beginTransaction();

      await saveBookFile(id, req.file, connection);
      await replaceBookPages(id, pages, connection);

      await connection.query(
        `
        UPDATE books
        SET
          source_type = ?,
          process_status = 'completed',
          full_text = ?,
          total_pages = ?,
          updated_at = NOW()
        WHERE id = ?
        `,
        [
          parsed.sourceType || path.extname(req.file.originalname).replace(".", "") || "file",
          parsed.fullText || pages.join("\n\n"),
          totalPages,
          id,
        ]
      );

      await connection.commit();

      res.json({
        message: "อัปเดตไฟล์เนื้อหาสำเร็จ",
        total_pages: totalPages,
      });
    } catch (error) {
      await connection.rollback();
      console.error("PUT /books/:id/content error:", error);
      res.status(500).json({ message: "อัปเดตไฟล์เนื้อหาไม่สำเร็จ" });
    } finally {
      connection.release();
    }
  }
);

// delete book
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    const [bookRows] = await connection.query(
      "SELECT id FROM books WHERE id = ? LIMIT 1",
      [id]
    );

    if (bookRows.length === 0) {
      return res.status(404).json({ message: "ไม่พบหนังสือที่ต้องการลบ" });
    }

    await connection.beginTransaction();

    await connection.query("DELETE FROM book_pages WHERE book_id = ?", [id]);
    await connection.query("DELETE FROM book_files WHERE book_id = ?", [id]);
    await connection.query("DELETE FROM reading_progress WHERE book_id = ?", [id]);
    await connection.query("DELETE FROM library WHERE book_id = ?", [id]);
    await connection.query("DELETE FROM cart WHERE book_id = ?", [id]);
    await connection.query("DELETE FROM cart_items WHERE book_id = ?", [id]);

    try {
      await connection.query("DELETE FROM book_views WHERE book_id = ?", [id]);
    } catch (_) {}

    try {
      await connection.query("DELETE FROM bookmarks WHERE book_id = ?", [id]);
    } catch (_) {}

    await connection.query("DELETE FROM books WHERE id = ?", [id]);

    await connection.commit();

    res.json({ message: "ลบหนังสือสำเร็จ" });
  } catch (error) {
    await connection.rollback();
    console.error("DELETE /books/:id error:", error);
    res.status(500).json({ message: "ลบหนังสือไม่สำเร็จ" });
  } finally {
    connection.release();
  }
});

module.exports = router;
