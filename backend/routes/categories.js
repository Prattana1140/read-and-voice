const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = express.Router();

let schemaReady = false;

async function ensureCategorySchema() {
  if (schemaReady) return;

  const [columns] = await db.query("SHOW COLUMNS FROM categories LIKE 'parent_id'");
  if (columns.length === 0) {
    await db.query("ALTER TABLE categories ADD COLUMN parent_id INT NULL AFTER name");
    await db.query("ALTER TABLE categories ADD INDEX idx_categories_parent_id (parent_id)");
  }

  const [displayToneColumns] = await db.query("SHOW COLUMNS FROM categories LIKE 'display_tone'");
  if (displayToneColumns.length === 0) {
    await db.query("ALTER TABLE categories ADD COLUMN display_tone VARCHAR(40) NULL AFTER parent_id");
  }

  const [displayArtColumns] = await db.query("SHOW COLUMNS FROM categories LIKE 'display_art'");
  if (displayArtColumns.length === 0) {
    await db.query("ALTER TABLE categories ADD COLUMN display_art VARCHAR(40) NULL AFTER display_tone");
  }

  const [showHomeColumns] = await db.query("SHOW COLUMNS FROM categories LIKE 'show_on_home'");
  if (showHomeColumns.length === 0) {
    await db.query("ALTER TABLE categories ADD COLUMN show_on_home TINYINT(1) NOT NULL DEFAULT 1 AFTER display_art");
  }

  const [sortColumns] = await db.query("SHOW COLUMNS FROM categories LIKE 'sort_order'");
  if (sortColumns.length === 0) {
    await db.query("ALTER TABLE categories ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER show_on_home");
    await db.query("ALTER TABLE categories ADD INDEX idx_categories_home_sort (show_on_home, sort_order)");
  }

  schemaReady = true;
}

function normalizeParentId(value) {
  if (value === undefined || value === null || value === "") return null;
  const parentId = Number(value);
  return Number.isInteger(parentId) && parentId > 0 ? parentId : NaN;
}

function normalizeOptionalText(value) {
  const text = String(value || "").trim();
  return text || null;
}

function normalizeBoolean(value, defaultValue = true) {
  if (value === undefined || value === null || value === "") return defaultValue ? 1 : 0;
  return value === true || value === 1 || value === "1" || value === "true" ? 1 : 0;
}

function normalizeSortOrder(value) {
  const sortOrder = Number(value);
  return Number.isFinite(sortOrder) ? Math.round(sortOrder) : 0;
}

async function validateParent(parentId, currentId = null) {
  if (parentId === null) return null;
  if (Number.isNaN(parentId)) {
    return "รูปแบบหมวดหลักไม่ถูกต้อง";
  }
  if (currentId && Number(currentId) === parentId) {
    return "ไม่สามารถเลือกตัวเองเป็นหมวดหลักได้";
  }

  const [rows] = await db.query(
    "SELECT id, parent_id FROM categories WHERE id = ? LIMIT 1",
    [parentId],
  );

  if (rows.length === 0) return "ไม่พบหมวดหลัก";
  if (rows[0].parent_id) return "เลือกได้เฉพาะหมวดหลักเท่านั้น";
  return null;
}

router.get("/", async (_req, res) => {
  try {
    await ensureCategorySchema();

    const [rows] = await db.query(
      `SELECT id, name, parent_id, display_tone, display_art, show_on_home, sort_order, created_at, NULL AS updated_at
       FROM categories
       ORDER BY sort_order ASC, COALESCE(parent_id, id) ASC, parent_id IS NOT NULL ASC, name ASC`,
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /categories error:", error);
    return res.status(500).json({ message: "ดึงหมวดหมู่ไม่สำเร็จ" });
  }
});

router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    await ensureCategorySchema();

    const name = String(req.body.name || "").trim();
    const parentId = normalizeParentId(req.body.parent_id);
    const displayTone = normalizeOptionalText(req.body.display_tone);
    const displayArt = normalizeOptionalText(req.body.display_art);
    const showOnHome = normalizeBoolean(req.body.show_on_home, true);
    const sortOrder = normalizeSortOrder(req.body.sort_order);

    if (!name) {
      return res.status(400).json({ message: "กรุณากรอกชื่อหมวดหมู่" });
    }

    const parentError = await validateParent(parentId);
    if (parentError) return res.status(400).json({ message: parentError });

    const [exists] = await db.query(
      "SELECT id FROM categories WHERE name = ? LIMIT 1",
      [name],
    );

    if (exists.length > 0) {
      return res.status(400).json({ message: "หมวดหมู่นี้มีอยู่แล้ว" });
    }

    const [result] = await db.query(
      "INSERT INTO categories (name, parent_id, display_tone, display_art, show_on_home, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      [name, parentId, displayTone, displayArt, showOnHome, sortOrder],
    );

    return res.json({
      message: "สร้างหมวดหมู่สำเร็จ",
      id: result.insertId,
    });
  } catch (error) {
    console.error("POST /categories error:", error);
    return res.status(500).json({ message: "สร้างหมวดหมู่ไม่สำเร็จ" });
  }
});

router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    await ensureCategorySchema();

    const name = String(req.body.name || "").trim();
    const parentId = normalizeParentId(req.body.parent_id);
    const displayTone = normalizeOptionalText(req.body.display_tone);
    const displayArt = normalizeOptionalText(req.body.display_art);
    const showOnHome = normalizeBoolean(req.body.show_on_home, true);
    const sortOrder = normalizeSortOrder(req.body.sort_order);
    const { id } = req.params;

    if (!name) {
      return res.status(400).json({ message: "กรุณากรอกชื่อหมวดหมู่" });
    }

    const [exists] = await db.query(
      "SELECT id FROM categories WHERE id = ? LIMIT 1",
      [id],
    );

    if (exists.length === 0) {
      return res.status(404).json({ message: "ไม่พบหมวดหมู่" });
    }

    const parentError = await validateParent(parentId, id);
    if (parentError) return res.status(400).json({ message: parentError });

    const [duplicate] = await db.query(
      "SELECT id FROM categories WHERE name = ? AND id <> ? LIMIT 1",
      [name, id],
    );

    if (duplicate.length > 0) {
      return res.status(400).json({ message: "หมวดหมู่นี้มีอยู่แล้ว" });
    }

    await db.query("UPDATE categories SET name = ?, parent_id = ?, display_tone = ?, display_art = ?, show_on_home = ?, sort_order = ? WHERE id = ?", [
      name,
      parentId,
      displayTone,
      displayArt,
      showOnHome,
      sortOrder,
      id,
    ]);

    return res.json({ message: "แก้ไขหมวดหมู่สำเร็จ" });
  } catch (error) {
    console.error("PUT /categories/:id error:", error);
    return res.status(500).json({ message: "แก้ไขหมวดหมู่ไม่สำเร็จ" });
  }
});

router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    await ensureCategorySchema();

    const { id } = req.params;

    const [exists] = await db.query(
      "SELECT id FROM categories WHERE id = ? LIMIT 1",
      [id],
    );

    if (exists.length === 0) {
      return res.status(404).json({ message: "ไม่พบหมวดหมู่" });
    }

    const [children] = await db.query(
      "SELECT id FROM categories WHERE parent_id = ? LIMIT 1",
      [id],
    );

    if (children.length > 0) {
      return res.status(400).json({
        message: "ลบหมวดหลักไม่ได้ เพราะยังมีหมวดย่อยอยู่",
      });
    }

    await db.query("DELETE FROM categories WHERE id = ?", [id]);

    return res.json({ message: "ลบหมวดหมู่สำเร็จ" });
  } catch (error) {
    console.error("DELETE /categories/:id error:", error);
    return res.status(500).json({ message: "ลบหมวดหมู่ไม่สำเร็จ" });
  }
});

module.exports = router;
