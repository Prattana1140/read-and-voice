const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = express.Router();

let schemaReady = false;

const defaultNameEnByTh = {
  "นิยาย": "Fiction",
  "นิยายรัก": "Romance",
  "นิยายรักวัยรุ่น": "Teen Romance",
  "นิยายรักวัยว้าวุ่น": "Coming-of-age Romance",
  "นิยายโรแมนซ์": "Romance Novel",
  "นิยายรักผู้ใหญ่": "Adult Romance",
  "นิยายรักจีนโบราณ": "Historical Chinese Romance",
  "นิยาย Boy Love Lovely Room": "Boy Love Lovely Room",
  "นิยาย Boy Love Party Room": "Boy Love Party Room",
  "นิยาย Boy Love Secret Room": "Boy Love Secret Room",
  "นิยาย Girl Love Lovely Room": "Girl Love Lovely Room",
  "นิยาย Girl Love Party Room": "Girl Love Party Room",
  "นิยาย Girl Love Secret Room": "Girl Love Secret Room",
  "แฟนตาซี เกมออนไลน์ ต่างโลก": "Fantasy, Online Games, Isekai",
  "แฟนตาซี": "Fantasy",
  "Sci-fi": "Sci-fi",
  "ไซไฟ": "Sci-fi",
  "ผจญภัย แอคชั่น กำลังภายใน": "Adventure, Action, Martial Arts",
  "สืบสวน": "Mystery",
  "ลึกลับ": "Suspense",
  "สยองขวัญ": "Horror",
  "สะท้อนสังคม": "Social Issues",
  "แนวทางเลือก": "Alternative",
  "สาระความรู้": "Knowledge",
  "เรื่องนี้ที่อยากเล่า/ไดอารี่": "Diary",
  "สัพเพเหระ": "Miscellaneous",
  "วรรณกรรมเยาวชน": "Young Adult",
  "ความรู้": "Knowledge",
  "ธุรกิจ": "Business",
  "เทคโนโลยี": "Technology",
  "ภาษา": "Language",
  "สุขภาพ": "Health",
  "เด็กและเยาวชน": "Children and Young Adult",
  "วรรณกรรม": "Literature",
  "โรแมนซ์": "Romance",
  "ดราม่า": "Drama",
  "ตราม่า": "Drama",
  "พัฒนาตนเอง": "Self Improvement",
  "การศึกษา": "Education",
  "คอมพิวเตอร์": "Computer",
  "ไลท์โนเวล": "Light Novel",
  "ตำราเรียน": "Textbook",
  "อื่นๆ": "Others",
};

async function ensureCategorySchema() {
  if (schemaReady) return;

  const [nameThColumns] = await db.query("SHOW COLUMNS FROM categories LIKE 'name_th'");
  if (nameThColumns.length === 0) {
    await db.query("ALTER TABLE categories ADD COLUMN name_th VARCHAR(255) NULL AFTER name");
  }

  const [nameEnColumns] = await db.query("SHOW COLUMNS FROM categories LIKE 'name_en'");
  if (nameEnColumns.length === 0) {
    await db.query("ALTER TABLE categories ADD COLUMN name_en VARCHAR(255) NULL AFTER name_th");
  }

  const [columns] = await db.query("SHOW COLUMNS FROM categories LIKE 'parent_id'");
  if (columns.length === 0) {
    await db.query("ALTER TABLE categories ADD COLUMN parent_id INT NULL AFTER name");
    await db.query("ALTER TABLE categories ADD INDEX idx_categories_parent_id (parent_id)");
  }

  const [scopeColumns] = await db.query("SHOW COLUMNS FROM categories LIKE 'content_scope'");
  if (scopeColumns.length === 0) {
    await db.query("ALTER TABLE categories ADD COLUMN content_scope VARCHAR(20) NOT NULL DEFAULT 'all' AFTER parent_id");
    await db.query("ALTER TABLE categories ADD INDEX idx_categories_content_scope (content_scope)");
  }

  const [displayToneColumns] = await db.query("SHOW COLUMNS FROM categories LIKE 'display_tone'");
  if (displayToneColumns.length === 0) {
    await db.query("ALTER TABLE categories ADD COLUMN display_tone VARCHAR(40) NULL AFTER content_scope");
  }

  const [displayArtColumns] = await db.query("SHOW COLUMNS FROM categories LIKE 'display_art'");
  if (displayArtColumns.length === 0) {
    await db.query("ALTER TABLE categories ADD COLUMN display_art VARCHAR(40) NULL AFTER display_tone");
  }

  await db.query("UPDATE categories SET content_scope = 'serial' WHERE content_scope = 'all' AND display_tone = 'serial'");
  await db.query(`
    UPDATE categories c
    SET c.content_scope = 'all'
    WHERE c.content_scope IN ('ebook', 'serial')
      AND EXISTS (
        SELECT 1
        FROM books b
        WHERE b.category_id = c.id
          AND COALESCE(b.content_type, 'ebook') <> c.content_scope
      )
  `);

  const [showHomeColumns] = await db.query("SHOW COLUMNS FROM categories LIKE 'show_on_home'");
  if (showHomeColumns.length === 0) {
    await db.query("ALTER TABLE categories ADD COLUMN show_on_home TINYINT(1) NOT NULL DEFAULT 1 AFTER display_art");
  }

  const [sortColumns] = await db.query("SHOW COLUMNS FROM categories LIKE 'sort_order'");
  if (sortColumns.length === 0) {
    await db.query("ALTER TABLE categories ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER show_on_home");
    await db.query("ALTER TABLE categories ADD INDEX idx_categories_home_sort (show_on_home, sort_order)");
  }

  await db.query("UPDATE categories SET name_th = name WHERE name_th IS NULL OR name_th = ''");
  for (const [nameTh, nameEn] of Object.entries(defaultNameEnByTh)) {
    await db.query(
      "UPDATE categories SET name_en = ? WHERE name = ? AND (name_en IS NULL OR name_en = '')",
      [nameEn, nameTh],
    );
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

function normalizeContentScope(value, defaultValue = "all") {
  const scope = String(value || defaultValue).trim().toLowerCase();
  return ["all", "ebook", "serial"].includes(scope) ? scope : defaultValue;
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

router.get("/", async (req, res) => {
  try {
    await ensureCategorySchema();

    const filters = [];
    const params = [];
    const requestedScope = String(req.query.content_scope || req.query.scope || "").trim().toLowerCase();
    const includeAllScope = !["0", "false", "no"].includes(
      String(req.query.include_all ?? "1").trim().toLowerCase(),
    );
    if (requestedScope && ["ebook", "serial"].includes(requestedScope)) {
      filters.push(includeAllScope ? "(content_scope = ? OR content_scope = 'all')" : "content_scope = ?");
      params.push(requestedScope);
    } else if (requestedScope === "all") {
      filters.push("content_scope = 'all'");
    }

    const requestedTone = String(req.query.display_tone || "").trim();
    if (requestedTone) {
      filters.push("display_tone = ?");
      params.push(requestedTone);
    }

    const [rows] = await db.query(
      `SELECT id, name, COALESCE(name_th, name) AS name_th, name_en, parent_id, content_scope, display_tone, display_art, show_on_home, sort_order, created_at, NULL AS updated_at
       FROM categories
       ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
       ORDER BY sort_order ASC, COALESCE(parent_id, id) ASC, parent_id IS NOT NULL ASC, name ASC`,
      params,
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

    const nameTh = String(req.body.name_th || req.body.name || "").trim();
    const nameEn = String(req.body.name_en || "").trim();
    const name = nameTh;
    const parentId = normalizeParentId(req.body.parent_id);
    const contentScope = normalizeContentScope(req.body.content_scope || req.body.scope);
    const displayTone = normalizeOptionalText(req.body.display_tone);
    const displayArt = normalizeOptionalText(req.body.display_art);
    const showOnHome = normalizeBoolean(req.body.show_on_home, true);
    const sortOrder = normalizeSortOrder(req.body.sort_order);

    if (!nameTh || !nameEn) {
      return res.status(400).json({ message: "กรุณากรอกชื่อหมวดหมู่ทั้งภาษาไทยและอังกฤษ" });
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
      "INSERT INTO categories (name, name_th, name_en, parent_id, content_scope, display_tone, display_art, show_on_home, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [name, nameTh, nameEn, parentId, contentScope, displayTone, displayArt, showOnHome, sortOrder],
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

    const nameTh = String(req.body.name_th || req.body.name || "").trim();
    const nameEn = String(req.body.name_en || "").trim();
    const name = nameTh;
    const parentId = normalizeParentId(req.body.parent_id);
    const displayTone = normalizeOptionalText(req.body.display_tone);
    const displayArt = normalizeOptionalText(req.body.display_art);
    const showOnHome = normalizeBoolean(req.body.show_on_home, true);
    const sortOrder = normalizeSortOrder(req.body.sort_order);
    const { id } = req.params;

    if (!nameTh || !nameEn) {
      return res.status(400).json({ message: "กรุณากรอกชื่อหมวดหมู่ทั้งภาษาไทยและอังกฤษ" });
    }

    const [exists] = await db.query(
      "SELECT id, content_scope FROM categories WHERE id = ? LIMIT 1",
      [id],
    );

    if (exists.length === 0) {
      return res.status(404).json({ message: "ไม่พบหมวดหมู่" });
    }

    const contentScope = normalizeContentScope(
      req.body.content_scope || req.body.scope,
      exists[0].content_scope || "all",
    );

    const parentError = await validateParent(parentId, id);
    if (parentError) return res.status(400).json({ message: parentError });

    const [duplicate] = await db.query(
      "SELECT id FROM categories WHERE name = ? AND id <> ? LIMIT 1",
      [name, id],
    );

    if (duplicate.length > 0) {
      return res.status(400).json({ message: "หมวดหมู่นี้มีอยู่แล้ว" });
    }

    await db.query("UPDATE categories SET name = ?, name_th = ?, name_en = ?, parent_id = ?, content_scope = ?, display_tone = ?, display_art = ?, show_on_home = ?, sort_order = ? WHERE id = ?", [
      name,
      nameTh,
      nameEn,
      parentId,
      contentScope,
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
