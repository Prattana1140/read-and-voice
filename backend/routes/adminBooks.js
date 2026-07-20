const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const { ensureCatalogAnalyticsSchema } = require("../services/catalogSchema");

const router = express.Router();

const PLACEMENT_FIELDS = [
  "is_best_seller",
  "is_new_release",
  "is_promotion",
  "is_free_book",
  "is_hall_of_fame",
  "is_recommended",
];

const REQUESTED_FIELDS = [
  "requested_best_seller",
  "requested_new_release",
  "requested_promotion",
  "requested_free_book",
  "requested_hall_of_fame",
  "requested_recommended",
];

function toBoolNumber(value) {
  return Number(Boolean(value));
}

function normalizeApprovalStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return ["pending", "approved", "rejected"].includes(status) ? status : null;
}

function normalizeDiscountPercent(value) {
  const numberValue = Number(value || 0);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return 0;
  return Math.min(95, Math.max(1, Math.round(numberValue)));
}

function normalizeNullableDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

router.get("/pending", verifyToken, requireAdmin, async (_req, res) => {
  try {
    await ensureCatalogAnalyticsSchema();
    const [rows] = await db.query(
      `SELECT
         b.id,
         b.title,
         b.title_th,
         b.title_en,
         COALESCE(b.author_name, b.author) AS author,
         b.content_type,
         b.description,
         COALESCE(b.cover_image_url, b.cover_image) AS cover_image,
         b.approval_status,
         b.approval_note,
         b.created_at,
         c.name AS category_name,
         b.requested_best_seller,
         b.requested_new_release,
         b.requested_promotion,
         b.requested_free_book,
         b.requested_hall_of_fame,
         b.requested_recommended,
         b.promo_discount_percent,
         b.promo_start_at,
         b.promo_end_at,
         b.is_best_seller,
         b.is_new_release,
         b.is_promotion,
         b.is_free_book,
         b.is_hall_of_fame,
         b.is_recommended
       FROM books b
       LEFT JOIN categories c ON c.id = b.category_id
       WHERE COALESCE(b.approval_status, 'pending') IN ('pending', 'rejected')
       ORDER BY b.created_at DESC, b.id DESC`,
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /admin/books/pending error:", error);
    return res.status(500).json({ message: "โหลดรายการหนังสือรออนุมัติไม่สำเร็จ" });
  }
});

router.get("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         b.*,
         c.name AS category_name
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
    console.error("GET /admin/books/:id error:", error);
    return res.status(500).json({ message: "โหลดรายละเอียดหนังสือไม่สำเร็จ" });
  }
});

router.put("/:id/approval", verifyToken, requireAdmin, async (req, res) => {
  try {
    await ensureCatalogAnalyticsSchema();
    const bookId = Number(req.params.id);
    const {
      approval_status = "approved",
      approval_note = null,
      is_best_seller = false,
      is_new_release = false,
      is_promotion = false,
      is_free_book = false,
      is_hall_of_fame = false,
      is_recommended = false,
      promo_discount_percent = 0,
      promo_start_at = null,
      promo_end_at = null,
    } = req.body;

    if (!Number.isInteger(bookId) || bookId <= 0) {
      return res.status(400).json({ message: "book id ไม่ถูกต้อง" });
    }

    const safeStatus = normalizeApprovalStatus(approval_status);
    if (!safeStatus) {
      return res.status(400).json({ message: "approval_status ไม่ถูกต้อง" });
    }

    const safeDiscount = normalizeDiscountPercent(promo_discount_percent);
    const safePromoStartAt = normalizeNullableDate(promo_start_at);
    const safePromoEndAt = normalizeNullableDate(promo_end_at);
    const safeIsPromotion = toBoolNumber(is_promotion);

    if (safePromoStartAt && safePromoEndAt && safePromoStartAt > safePromoEndAt) {
      return res.status(400).json({ message: "promotion start date must be before the end date" });
    }

    if (safeIsPromotion && safeDiscount <= 0) {
      return res.status(400).json({ message: "promotion requires a real discount percent" });
    }

    const [result] = await db.query(
      `UPDATE books
       SET approval_status = ?,
           approval_note = ?,
           approved_by = CASE WHEN ? = 'approved' THEN ? ELSE approved_by END,
           approved_at = CASE WHEN ? = 'approved' THEN NOW() ELSE approved_at END,
           is_published = CASE WHEN ? = 'approved' THEN 1 ELSE 0 END,
           lifecycle_status = CASE
             WHEN ? = 'approved' THEN 'published'
             WHEN ? = 'rejected' THEN 'draft'
             ELSE lifecycle_status
           END,
           is_best_seller = ?,
           is_new_release = ?,
           is_promotion = ?,
           is_free_book = ?,
           is_hall_of_fame = ?,
           is_recommended = ?,
           promo_discount_percent = ?,
           promo_start_at = ?,
           promo_end_at = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        safeStatus,
        approval_note,
        safeStatus,
        req.user.id,
        safeStatus,
        safeStatus,
        safeStatus,
        safeStatus,
        toBoolNumber(is_best_seller),
        toBoolNumber(is_new_release),
        safeIsPromotion,
        toBoolNumber(is_free_book),
        toBoolNumber(is_hall_of_fame),
        toBoolNumber(is_recommended),
        safeIsPromotion ? safeDiscount : 0,
        safeIsPromotion ? safePromoStartAt : null,
        safeIsPromotion ? safePromoEndAt : null,
        bookId,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบหนังสือ" });
    }

    return res.json({ message: "บันทึกการอนุมัติหนังสือสำเร็จ" });
  } catch (error) {
    console.error("PUT /admin/books/:id/approval error:", error);
    return res.status(500).json({ message: "บันทึกการอนุมัติไม่สำเร็จ" });
  }
});

router.put("/:id/requested-placements", verifyToken, async (req, res) => {
  try {
    const bookId = Number(req.params.id);
    const [rows] = await db.query(
      "SELECT id, created_by FROM books WHERE id = ? LIMIT 1",
      [bookId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบหนังสือ" });
    }

    const book = rows[0];
    const canEdit =
      ["admin", "superadmin"].includes(req.user.role) ||
      Number(book.created_by) === Number(req.user.id);

    if (!canEdit) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์แก้ไขคำขอหมวดแสดงผล" });
    }

    const values = REQUESTED_FIELDS.map((field) => toBoolNumber(req.body[field]));
    await db.query(
      `UPDATE books
       SET requested_best_seller = ?,
           requested_new_release = ?,
           requested_promotion = ?,
           requested_free_book = ?,
           requested_hall_of_fame = ?,
           requested_recommended = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [...values, bookId],
    );

    return res.json({ message: "บันทึกคำขอหมวดแสดงผลสำเร็จ" });
  } catch (error) {
    console.error("PUT /admin/books/:id/requested-placements error:", error);
    return res.status(500).json({ message: "บันทึกคำขอไม่สำเร็จ" });
  }
});

module.exports = router;
