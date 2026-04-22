const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

const SOCIAL_PROVIDERS = ["facebook", "line"];

let tablesReady;

async function ensureTables() {
  if (!tablesReady) {
    tablesReady = Promise.all([
      db.query(`
        CREATE TABLE IF NOT EXISTS account_follows (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          target_type VARCHAR(40) NOT NULL DEFAULT 'book',
          target_id INT NULL,
          target_name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_account_follows_user (user_id),
          CONSTRAINT fk_account_follows_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS gift_codes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          code VARCHAR(80) NOT NULL,
          description VARCHAR(255) NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'available',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          redeemed_at DATETIME NULL,
          UNIQUE KEY uq_gift_codes_user_code (user_id, code),
          INDEX idx_gift_codes_user (user_id),
          CONSTRAINT fk_gift_codes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS user_devices (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          device_name VARCHAR(255) NOT NULL,
          platform VARCHAR(80) NULL,
          last_used_at DATETIME NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_devices_user (user_id),
          CONSTRAINT fk_user_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS user_benefits (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'active',
          expires_at DATETIME NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_benefits_user (user_id),
          CONSTRAINT fk_user_benefits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS book_reviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          book_id INT NOT NULL,
          rating INT NOT NULL,
          comment TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_book_reviews_user_id (user_id),
          INDEX idx_book_reviews_book_id (book_id),
          CONSTRAINT fk_book_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_book_reviews_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS age_verifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'not_submitted',
          document_type VARCHAR(60) NULL,
          note TEXT NULL,
          submitted_at DATETIME NULL,
          reviewed_at DATETIME NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_age_verifications_user (user_id),
          CONSTRAINT fk_age_verifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS social_connections (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          provider VARCHAR(40) NOT NULL,
          provider_user_id VARCHAR(191) NOT NULL,
          display_name VARCHAR(255) NULL,
          email VARCHAR(255) NULL,
          connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_social_connections_provider_user (provider, provider_user_id),
          UNIQUE KEY uq_social_connections_user_provider (user_id, provider),
          INDEX idx_social_connections_user (user_id),
          CONSTRAINT fk_social_connections_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `),
    ]).then(() => true);
  }

  return tablesReady;
}

router.use(verifyToken);

router.get("/social-connections", async (req, res) => {
  try {
    await ensureTables();
    const [rows] = await db.query(
      `SELECT provider, provider_user_id, display_name, email, connected_at, updated_at
       FROM social_connections
       WHERE user_id = ?
       ORDER BY provider ASC`,
      [req.user.id],
    );

    const connectedMap = rows.reduce((map, row) => {
      map[row.provider] = {
        provider: row.provider,
        connected: true,
        display_name: row.display_name,
        email: row.email,
        connected_at: row.connected_at,
        updated_at: row.updated_at,
      };
      return map;
    }, {});

    return res.json({
      providers: SOCIAL_PROVIDERS.map((provider) => ({
        provider,
        connected: false,
        display_name: null,
        email: null,
        connected_at: null,
        updated_at: null,
        ...(connectedMap[provider] || {}),
      })),
    });
  } catch (error) {
    console.error("GET /account/social-connections error:", error);
    return res.status(500).json({ message: "โหลดสถานะการเชื่อมต่อ social ไม่สำเร็จ" });
  }
});

router.delete("/social-connections/:provider", async (req, res) => {
  try {
    await ensureTables();
    const provider = String(req.params.provider || "").toLowerCase();

    if (!SOCIAL_PROVIDERS.includes(provider)) {
      return res.status(400).json({ message: "provider ไม่ถูกต้อง" });
    }

    await db.query(
      "DELETE FROM social_connections WHERE user_id = ? AND provider = ?",
      [req.user.id, provider],
    );

    return res.json({ message: "ยกเลิกการเชื่อมต่อสำเร็จ" });
  } catch (error) {
    console.error("DELETE /account/social-connections/:provider error:", error);
    return res.status(500).json({ message: "ยกเลิกการเชื่อมต่อไม่สำเร็จ" });
  }
});

router.get("/following", async (req, res) => {
  try {
    await ensureTables();
    const [rows] = await db.query(
      `SELECT id, target_type, target_id, target_name, created_at
       FROM account_follows
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id],
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error("GET /account/following error:", error);
    return res.status(500).json({ message: "โหลดรายการที่ติดตามไม่สำเร็จ" });
  }
});

router.post("/following", async (req, res) => {
  try {
    await ensureTables();
    const targetType = String(req.body.target_type || "book").trim();
    const targetId = req.body.target_id ? Number(req.body.target_id) : null;
    const targetName = String(req.body.target_name || "").trim();

    if (!targetName) {
      return res.status(400).json({ message: "กรุณาระบุชื่อรายการที่ต้องการติดตาม" });
    }

    const [result] = await db.query(
      `INSERT INTO account_follows (user_id, target_type, target_id, target_name)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, targetType, targetId, targetName],
    );

    return res.json({ message: "ติดตามสำเร็จ", id: result.insertId });
  } catch (error) {
    console.error("POST /account/following error:", error);
    return res.status(500).json({ message: "ติดตามไม่สำเร็จ" });
  }
});

router.delete("/following/:id", async (req, res) => {
  try {
    await ensureTables();
    await db.query("DELETE FROM account_follows WHERE id = ? AND user_id = ?", [
      req.params.id,
      req.user.id,
    ]);

    return res.json({ message: "ยกเลิกติดตามสำเร็จ" });
  } catch (error) {
    console.error("DELETE /account/following/:id error:", error);
    return res.status(500).json({ message: "ยกเลิกติดตามไม่สำเร็จ" });
  }
});

router.get("/gift-codes", async (req, res) => {
  try {
    await ensureTables();
    const [rows] = await db.query(
      `SELECT id, code, description, status, created_at, redeemed_at
       FROM gift_codes
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id],
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error("GET /account/gift-codes error:", error);
    return res.status(500).json({ message: "โหลด Gift Code ไม่สำเร็จ" });
  }
});

router.get("/buffet", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         us.id,
         us.plan_id,
         us.status,
         us.payment_status,
         us.start_at,
         us.end_at,
         sp.name AS title,
         sp.description,
         sp.price,
         sp.duration_days
       FROM user_subscriptions us
       LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
       WHERE us.user_id = ?
       ORDER BY us.end_at DESC, us.id DESC
       LIMIT 10`,
      [req.user.id],
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error("GET /account/buffet error:", error);
    return res.json({
      items: [],
      message: "ยังไม่มีข้อมูลบุฟเฟต์ หรือยังไม่ได้รัน migration ระบบสมาชิก",
    });
  }
});

router.get("/devices", async (req, res) => {
  try {
    await ensureTables();
    const [rows] = await db.query(
      `SELECT id, device_name, platform, last_used_at, created_at
       FROM user_devices
       WHERE user_id = ?
       ORDER BY COALESCE(last_used_at, created_at) DESC`,
      [req.user.id],
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error("GET /account/devices error:", error);
    return res.status(500).json({ message: "โหลดรายการอุปกรณ์ไม่สำเร็จ" });
  }
});

router.post("/devices", async (req, res) => {
  try {
    await ensureTables();
    const deviceName = String(req.body.device_name || "").trim();
    const platform = String(req.body.platform || "").trim() || null;

    if (!deviceName) {
      return res.status(400).json({ message: "กรุณาระบุชื่ออุปกรณ์" });
    }

    const [result] = await db.query(
      `INSERT INTO user_devices (user_id, device_name, platform, last_used_at)
       VALUES (?, ?, ?, NOW())`,
      [req.user.id, deviceName, platform],
    );

    return res.json({ message: "เพิ่มอุปกรณ์สำเร็จ", id: result.insertId });
  } catch (error) {
    console.error("POST /account/devices error:", error);
    return res.status(500).json({ message: "เพิ่มอุปกรณ์ไม่สำเร็จ" });
  }
});

router.put("/devices/:id", async (req, res) => {
  try {
    await ensureTables();
    const deviceId = Number(req.params.id);
    const deviceName = String(req.body.device_name || "").trim();
    const platform = String(req.body.platform || "").trim() || null;

    if (!deviceId || Number.isNaN(deviceId)) {
      return res.status(400).json({ message: "id อุปกรณ์ไม่ถูกต้อง" });
    }

    if (!deviceName) {
      return res.status(400).json({ message: "กรุณาระบุชื่ออุปกรณ์" });
    }

    const [result] = await db.query(
      `UPDATE user_devices
       SET device_name = ?, platform = ?, last_used_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [deviceName, platform, deviceId, req.user.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้ในบัญชีของคุณ" });
    }

    return res.json({ message: "อัปเดตอุปกรณ์สำเร็จ" });
  } catch (error) {
    console.error("PUT /account/devices/:id error:", error);
    return res.status(500).json({ message: "อัปเดตอุปกรณ์ไม่สำเร็จ" });
  }
});

router.delete("/devices/:id", async (req, res) => {
  try {
    await ensureTables();
    const deviceId = Number(req.params.id);

    if (!deviceId || Number.isNaN(deviceId)) {
      return res.status(400).json({ message: "id อุปกรณ์ไม่ถูกต้อง" });
    }

    const [result] = await db.query(
      "DELETE FROM user_devices WHERE id = ? AND user_id = ?",
      [deviceId, req.user.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบอุปกรณ์นี้ในบัญชีของคุณ" });
    }

    return res.json({ message: "ลบอุปกรณ์สำเร็จ" });
  } catch (error) {
    console.error("DELETE /account/devices/:id error:", error);
    return res.status(500).json({ message: "ลบอุปกรณ์ไม่สำเร็จ" });
  }
});

router.get("/benefits", async (req, res) => {
  try {
    await ensureTables();
    const [rows] = await db.query(
      `SELECT id, title, description, status, expires_at, created_at
       FROM user_benefits
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id],
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error("GET /account/benefits error:", error);
    return res.status(500).json({ message: "โหลดสิทธิพิเศษไม่สำเร็จ" });
  }
});

router.get("/reviews", async (req, res) => {
  try {
    await ensureTables();
    const [rows] = await db.query(
      `SELECT
         r.id,
         r.book_id,
         r.rating,
         r.comment,
         r.created_at,
         r.updated_at,
         b.title AS book_title,
         b.cover_image
       FROM book_reviews r
       JOIN books b ON b.id = r.book_id
       WHERE r.user_id = ?
       ORDER BY r.updated_at DESC`,
      [req.user.id],
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error("GET /account/reviews error:", error);
    return res.status(500).json({ message: "โหลดรีวิวไม่สำเร็จ" });
  }
});

router.post("/reviews", async (req, res) => {
  try {
    await ensureTables();
    const bookId = Number(req.body.book_id);
    const rating = Math.min(5, Math.max(1, Number(req.body.rating || 5)));
    const comment = String(req.body.comment || "").trim();

    if (!bookId || Number.isNaN(bookId)) {
      return res.status(400).json({ message: "book_id ไม่ถูกต้อง" });
    }

    await db.query(
      `INSERT INTO book_reviews (user_id, book_id, rating, comment)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, bookId, rating, comment],
    );

    return res.json({ message: "บันทึกรีวิวสำเร็จ" });
  } catch (error) {
    console.error("POST /account/reviews error:", error);
    return res.status(500).json({ message: "บันทึกรีวิวไม่สำเร็จ" });
  }
});

router.get("/age-verification", async (req, res) => {
  try {
    await ensureTables();
    const [rows] = await db.query(
      `SELECT id, status, document_type, note, submitted_at, reviewed_at, updated_at
       FROM age_verifications
       WHERE user_id = ?
       LIMIT 1`,
      [req.user.id],
    );

    return res.json(
      rows[0] || {
        status: "not_submitted",
        document_type: null,
        note: null,
        submitted_at: null,
        reviewed_at: null,
      },
    );
  } catch (error) {
    console.error("GET /account/age-verification error:", error);
    return res.status(500).json({ message: "โหลดสถานะยืนยันอายุไม่สำเร็จ" });
  }
});

router.post("/age-verification", async (req, res) => {
  try {
    await ensureTables();
    const documentType = String(req.body.document_type || "id_card").trim();
    const note = String(req.body.note || "").trim() || null;

    await db.query(
      `INSERT INTO age_verifications (user_id, status, document_type, note, submitted_at)
       VALUES (?, 'pending', ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         status = 'pending',
         document_type = VALUES(document_type),
         note = VALUES(note),
         submitted_at = NOW(),
         updated_at = NOW()`,
      [req.user.id, documentType, note],
    );

    return res.json({ message: "ส่งคำขอยืนยันอายุสำเร็จ" });
  } catch (error) {
    console.error("POST /account/age-verification error:", error);
    return res.status(500).json({ message: "ส่งคำขอยืนยันอายุไม่สำเร็จ" });
  }
});

module.exports = router;
