const express = require("express");
const db = require("../config/db");
const { optionalVerifyToken } = require("../middleware/auth");
const { sanitizeBookText } = require("../services/fileParser");
const { ensureCatalogAnalyticsSchema } = require("../services/catalogSchema");

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

async function getBookById(bookId) {
  const [rows] = await db.query(
    `SELECT id, title, access_type, price, created_by, lifecycle_status
     FROM books
     WHERE id = ?
     LIMIT 1`,
    [bookId],
  );

  return rows[0] || null;
}

async function canAccessBook(user, book) {
  if (!book) return false;
  if (book.access_type === "free") return true;
  if (!user) return false;
  if (await isBookOwnerOrAdmin(user, book.id)) return true;
  if (book.access_type === "paid") return hasPurchasedBook(user.id, book.id);
  if (book.access_type === "subscription") return hasActiveSubscription(user.id);
  return false;
}

async function canAccessUnit(user, book, unit) {
  if (!book || !unit) return false;
  if (Number(unit.is_preview) === 1) return true;
  if (await canAccessBook(user, book)) return true;

  if (unit.access_type === "free") return true;
  if (!user) return false;
  if (await isBookOwnerOrAdmin(user, book.id)) return true;
  if (unit.access_type === "paid") return false;
  if (unit.access_type === "subscription") return hasActiveSubscription(user.id);
  return false;
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
    await ensureCatalogAnalyticsSchema();
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

    await db.query(
      `INSERT INTO book_views (book_id, user_id, viewed_at)
       VALUES (?, ?, NOW())`,
      [book.id, req.user?.id || null],
    );

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
    await ensureCatalogAnalyticsSchema();
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

    await db.query(
      `INSERT INTO episode_views (episode_id, user_id, viewed_at)
       VALUES (?, ?, NOW())`,
      [episode.id, req.user?.id || null],
    );

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

router.get("/books/:bookId/access", optionalVerifyToken, async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    const book = await getBookById(bookId);

    if (!book) {
      return res.status(404).json({ message: "ไม่พบหนังสือ" });
    }

    const canReadFull = await canAccessBook(req.user, book);
    const [unitRows] = await db.query(
      `SELECT id, title, unit_number, access_type, is_preview
       FROM book_units
       WHERE book_id = ?
         AND lifecycle_status IN ('draft', 'published')
       ORDER BY unit_number ASC, id ASC`,
      [bookId],
    );

    const units = await Promise.all(
      unitRows.map(async (unit) => ({
        id: unit.id,
        title: unit.title,
        unit_number: unit.unit_number,
        is_preview: Number(unit.is_preview) === 1,
        is_locked: !(await canAccessUnit(req.user, book, unit)),
      })),
    );

    return res.json({
      can_read_full: canReadFull,
      can_preview: units.some((unit) => !unit.is_locked),
      reason: canReadFull ? null : book.access_type === "subscription" ? "subscription_required" : "purchase_required",
      units,
    });
  } catch (error) {
    console.error("GET /reader/books/:bookId/access error:", error);
    return res.status(500).json({ message: "ตรวจสอบสิทธิ์ไม่สำเร็จ" });
  }
});

router.get("/books/:bookId/units/:unitId", optionalVerifyToken, async (req, res) => {
  try {
    const bookId = Number(req.params.bookId);
    const unitId = Number(req.params.unitId);
    const book = await getBookById(bookId);

    if (!book) {
      return res.status(404).json({ message: "ไม่พบหนังสือ" });
    }

    const [unitRows] = await db.query(
      `SELECT id, book_id, unit_type, unit_number, title, access_type, is_preview
       FROM book_units
       WHERE id = ? AND book_id = ?
       LIMIT 1`,
      [unitId, bookId],
    );

    if (unitRows.length === 0) {
      return res.status(404).json({ message: "ไม่พบบทหรือตอน" });
    }

    const unit = unitRows[0];
    const allowed = await canAccessUnit(req.user, book, unit);

    if (!allowed) {
      return res.status(403).json({
        message: "ไม่มีสิทธิ์เข้าถึงเนื้อหานี้",
        is_locked: true,
        reason: unit.access_type === "subscription" ? "subscription_required" : "purchase_required",
      });
    }

    const [blockRows] = await db.query(
      `SELECT id, block_order, block_type, display_text, tts_text, speaker_name
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
    const [unitList] = await db.query(
      `SELECT id
       FROM book_units
       WHERE book_id = ?
         AND lifecycle_status IN ('draft', 'published')
       ORDER BY unit_number ASC, id ASC`,
      [bookId],
    );

    const unitIndex = unitList.findIndex((entry) => Number(entry.id) === unitId);
    const blocks = blockRows.map((block) => ({
      ...block,
      sentences: sentenceRows.filter((sentence) => sentence.block_id === block.id),
    }));

    return res.json({
      book: {
        id: book.id,
        title: book.title,
      },
      unit: {
        id: unit.id,
        unit_number: unit.unit_number,
        unit_type: unit.unit_type,
        title: unit.title,
        is_locked: false,
      },
      blocks,
      next_unit_id: unitIndex >= 0 ? unitList[unitIndex + 1]?.id || null : null,
      prev_unit_id: unitIndex > 0 ? unitList[unitIndex - 1]?.id || null : null,
    });
  } catch (error) {
    console.error("GET /reader/books/:bookId/units/:unitId error:", error);
    return res.status(500).json({ message: "โหลด reader payload ไม่สำเร็จ" });
  }
});

router.get("/books/:bookId/progress", optionalVerifyToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "กรุณาเข้าสู่ระบบก่อน" });
    }

    const bookId = Number(req.params.bookId);
    const [rows] = await db.query(
      `SELECT
         user_id,
         book_id,
         book_unit_id,
         block_id,
         sentence_id,
         sentence_uuid,
         progress_percent,
         last_position_ms,
         last_scroll_offset,
         reading_mode,
         updated_at
       FROM reading_progress
       WHERE user_id = ? AND book_id = ?
       LIMIT 1`,
      [req.user.id, bookId],
    );

    return res.json(rows[0] || null);
  } catch (error) {
    console.error("GET /reader/books/:bookId/progress error:", error);
    return res.status(500).json({ message: "โหลด progress ไม่สำเร็จ" });
  }
});

router.post("/books/:bookId/progress", optionalVerifyToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "กรุณาเข้าสู่ระบบก่อน" });
    }

    const bookId = Number(req.params.bookId);
    const {
      book_unit_id = null,
      block_id = null,
      sentence_id = null,
      sentence_uuid = null,
      progress_percent = 0,
      last_position_ms = 0,
      last_scroll_offset = 0,
      reading_mode = "read",
    } = req.body;

    await db.query(
      `INSERT INTO reading_progress
       (user_id, book_id, book_unit_id, block_id, sentence_id, sentence_uuid, progress_percent, last_position_ms, last_scroll_offset, reading_mode, last_read_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         book_unit_id = VALUES(book_unit_id),
         block_id = VALUES(block_id),
         sentence_id = VALUES(sentence_id),
         sentence_uuid = VALUES(sentence_uuid),
         progress_percent = VALUES(progress_percent),
         last_position_ms = VALUES(last_position_ms),
         last_scroll_offset = VALUES(last_scroll_offset),
         reading_mode = VALUES(reading_mode),
         last_read_at = NOW()`,
      [
        req.user.id,
        bookId,
        book_unit_id,
        block_id,
        sentence_id,
        sentence_uuid,
        Number(progress_percent || 0),
        Number(last_position_ms || 0),
        Number(last_scroll_offset || 0),
        ["read", "listen", "read_listen"].includes(reading_mode)
          ? reading_mode
          : "read",
      ],
    );

    return res.json({ message: "บันทึกตำแหน่งอ่านสำเร็จ" });
  } catch (error) {
    console.error("POST /reader/books/:bookId/progress error:", error);
    return res.status(500).json({ message: "บันทึก progress ไม่สำเร็จ" });
  }
});

router.get("/settings/tts", optionalVerifyToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "กรุณาเข้าสู่ระบบก่อน" });
    }

    let rows = [];
    try {
      [rows] = await db.query(
        `SELECT voice_name, locale, rate, pitch, volume, autoplay, highlight_enabled, updated_at
         FROM tts_user_settings
         WHERE user_id = ?
         LIMIT 1`,
        [req.user.id],
      );
    } catch (_) {
      [rows] = await db.query(
        `SELECT voice_name, lang AS locale, rate, pitch, volume, 0 AS autoplay, 1 AS highlight_enabled, updated_at
         FROM tts_settings
         WHERE user_id = ?
         LIMIT 1`,
        [req.user.id],
      );
    }

    return res.json(
      rows[0] || {
        voice_name: null,
        locale: "th-TH",
        rate: 1,
        pitch: 1,
        volume: 1,
        autoplay: 0,
        highlight_enabled: 1,
      },
    );
  } catch (error) {
    console.error("GET /reader/settings/tts error:", error);
    return res.status(500).json({ message: "โหลดค่าตั้งเสียงไม่สำเร็จ" });
  }
});

router.put("/settings/tts", optionalVerifyToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "กรุณาเข้าสู่ระบบก่อน" });
    }

    const {
      voice_name = null,
      locale = "th-TH",
      rate = 1,
      pitch = 1,
      volume = 1,
      autoplay = false,
      highlight_enabled = true,
    } = req.body;

    await db.query(
      `INSERT INTO tts_user_settings
       (user_id, voice_name, locale, rate, pitch, volume, autoplay, highlight_enabled, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         voice_name = VALUES(voice_name),
         locale = VALUES(locale),
         rate = VALUES(rate),
         pitch = VALUES(pitch),
         volume = VALUES(volume),
         autoplay = VALUES(autoplay),
         highlight_enabled = VALUES(highlight_enabled),
         updated_at = NOW()`,
      [
        req.user.id,
        voice_name,
        locale,
        Number(rate || 1),
        Number(pitch || 1),
        Number(volume || 1),
        Number(Boolean(autoplay)),
        Number(Boolean(highlight_enabled)),
      ],
    );

    return res.json({ message: "บันทึกค่าตั้งเสียงสำเร็จ" });
  } catch (error) {
    console.error("PUT /reader/settings/tts error:", error);
    return res.status(500).json({ message: "บันทึกค่าตั้งเสียงไม่สำเร็จ" });
  }
});

module.exports = router;
