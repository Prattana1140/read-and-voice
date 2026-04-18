const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

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

router.get("/mine", verifyToken, async (req, res) => {
  try {
    if (!isWriterLike(req.user.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึง" });
    }

    const [rows] = await db.query(
      `SELECT
         b.id,
         b.title,
         b.author,
         b.description,
         b.cover_image,
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

    return res.json(rows);
  } catch (error) {
    console.error("GET /writer/books/mine error:", error);
    return res.status(500).json({ message: "ดึงหนังสือของฉันไม่สำเร็จ" });
  }
});

router.put("/:id", verifyToken, async (req, res) => {
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
      author,
      description,
      category_id,
      cover_image,
      access_type,
      price,
    } = req.body;

    await db.query(
      `UPDATE books
       SET title = ?,
           author = COALESCE(?, author),
           description = ?,
           category_id = ?,
           cover_image = ?,
           access_type = ?,
           price = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        title,
        author || null,
        description || null,
        category_id || null,
        cover_image || null,
        access_type || "free",
        Number(price || 0),
        bookId,
      ]
    );

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
      `SELECT id, book_id, title, episode_number, access_type, price, created_at, updated_at
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
      episode_number,
      content_text,
      content,
      access_type,
      price,
    } = req.body;
    const episodeContent = content_text || content || "";

    if (!title || !episodeContent) {
      return res.status(400).json({ message: "กรอกข้อมูลตอนให้ครบ" });
    }

    const [result] = await db.query(
      `INSERT INTO book_episodes
       (book_id, title, episode_number, content, access_type, price, is_free, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        req.params.bookId,
        title,
        Number(episode_number || 1),
        episodeContent,
        access_type || "free",
        Number(price || 0),
        access_type === "free" || Number(price || 0) <= 0 ? 1 : 0,
      ]
    );

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

    const { title, episode_number, content_text, content, access_type, price } =
      req.body;
    const episodeContent = content_text || content || "";

    await db.query(
      `UPDATE book_episodes
       SET title = ?, episode_number = ?, content = ?, access_type = ?, price = ?
       WHERE id = ?`,
      [
        title,
        Number(episode_number || 1),
        episodeContent,
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
