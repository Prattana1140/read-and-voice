const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");
const { requireSuperAdmin } = require("../middleware/superadmin");

const router = express.Router();

const allowedRoles = ["user", "writer", "admin", "superadmin"];
const allowedStatuses = ["active", "banned"];
const allowedAgeVerificationStatuses = ["not_submitted", "pending", "approved", "rejected"];

let accountAdminTablesReady;

async function ensureAccountAdminTables() {
  if (!accountAdminTablesReady) {
    accountAdminTablesReady = Promise.all([
      db.query(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          user_id INT PRIMARY KEY,
          username VARCHAR(64) NULL,
          avatar_url TEXT NULL,
          phone VARCHAR(50) NULL,
          gender VARCHAR(30) NULL,
          birth_date DATE NULL,
          age_verified TINYINT(1) NOT NULL DEFAULT 0,
          visual_impairment_status VARCHAR(40) NOT NULL DEFAULT 'not_specified',
          uses_screen_reader TINYINT(1) NOT NULL DEFAULT 0,
          assistive_technology VARCHAR(255) NULL,
          preferred_reading_mode VARCHAR(40) NULL,
          province VARCHAR(100) NULL,
          bio TEXT NULL,
          accessibility_mode TINYINT(1) NOT NULL DEFAULT 0,
          visual_impairment_verified TINYINT(1) NOT NULL DEFAULT 0,
          terms_accepted_at DATETIME NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_admin_user_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
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
        CREATE TABLE IF NOT EXISTS coin_topup_orders (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          package_id VARCHAR(80) NULL,
          coins INT NOT NULL,
          price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          status VARCHAR(30) NOT NULL DEFAULT 'pending',
          provider_ref VARCHAR(191) NULL,
          paid_at DATETIME NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_coin_topup_orders_user (user_id),
          INDEX idx_coin_topup_orders_status (status),
          CONSTRAINT fk_admin_coin_topup_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `),
    ]).then(() => true);
  }

  return accountAdminTablesReady;
}

async function listUsers(_req, res) {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, role, status, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /admin/users error:", error);
    return res.status(500).json({ message: "Unable to load users" });
  }
}

async function updateUserStatus(req, res) {
  try {
    const userId = Number(req.params.id);
    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid user status" });
    }

    if (userId === Number(req.user.id)) {
      return res.status(400).json({ message: "You cannot change your own status" });
    }

    const [result] = await db.query(
      "UPDATE users SET status = ? WHERE id = ?",
      [status, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message:
        status === "banned"
          ? "User banned successfully"
          : "User unbanned successfully",
    });
  } catch (error) {
    console.error("PUT /admin/users/:id/status error:", error);
    return res.status(500).json({ message: "Unable to update user status" });
  }
}

async function updateUserRole(req, res) {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (userId === Number(req.user.id) && role !== req.user.role) {
      return res.status(400).json({ message: "You cannot change your own role" });
    }

    const [targetRows] = await db.query(
      "SELECT id, role FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    const targetUser = targetRows[0];

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser.role === "superadmin" && role !== "superadmin") {
      return res.status(400).json({ message: "Superadmin role cannot be downgraded" });
    }

    const [result] = await db.query("UPDATE users SET role = ? WHERE id = ?", [
      role,
      userId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "User role updated successfully" });
  } catch (error) {
    console.error("PUT /admin/users/:id/role error:", error);
    return res.status(500).json({ message: "Unable to update user role" });
  }
}

function approveAdmin(req, res) {
  req.body.role = "admin";
  return updateUserRole(req, res);
}

function revokeAdmin(req, res) {
  req.body.role = "user";
  return updateUserRole(req, res);
}

async function listAgeVerifications(req, res) {
  try {
    await ensureAccountAdminTables();
    const status = String(req.query.status || "pending").trim();
    const params = [];
    let where = "";

    if (status !== "all") {
      if (!allowedAgeVerificationStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid age verification status" });
      }
      where = "WHERE av.status = ?";
      params.push(status);
    }

    const [rows] = await db.query(
      `SELECT
         av.id,
         av.user_id,
         u.name,
         u.email,
         av.status,
         av.document_type,
         av.note,
         av.submitted_at,
         av.reviewed_at,
         av.updated_at
       FROM age_verifications av
       JOIN users u ON u.id = av.user_id
       ${where}
       ORDER BY COALESCE(av.submitted_at, av.updated_at) DESC, av.id DESC`,
      params,
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error("GET /admin/age-verifications error:", error);
    return res.status(500).json({ message: "Unable to load age verifications" });
  }
}

async function updateAgeVerification(req, res) {
  try {
    await ensureAccountAdminTables();
    const userId = Number(req.params.userId || req.params.id);
    const status = String(req.body.status || "").trim();
    const note = String(req.body.note || "").trim() || null;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (!allowedAgeVerificationStatuses.includes(status) || status === "not_submitted") {
      return res.status(400).json({ message: "Invalid age verification status" });
    }

    const [users] = await db.query("SELECT id FROM users WHERE id = ? LIMIT 1", [userId]);
    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    await db.query(
      `INSERT INTO age_verifications (user_id, status, note, reviewed_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         note = VALUES(note),
         reviewed_at = NOW(),
         updated_at = NOW()`,
      [userId, status, note],
    );

    await db.query(
      `INSERT INTO user_profiles (user_id, age_verified)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE age_verified = VALUES(age_verified), updated_at = NOW()`,
      [userId, status === "approved" ? 1 : 0],
    );

    return res.json({ message: "Age verification updated successfully" });
  } catch (error) {
    console.error("PUT /admin/age-verifications/:userId error:", error);
    return res.status(500).json({ message: "Unable to update age verification" });
  }
}

async function issueBenefit(req, res) {
  try {
    await ensureAccountAdminTables();
    const userId = Number(req.params.userId);
    const title = String(req.body.title || "").trim();
    const description = String(req.body.description || "").trim() || null;
    const expiresAt = String(req.body.expires_at || "").trim() || null;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (!title) {
      return res.status(400).json({ message: "Benefit title is required" });
    }

    const [result] = await db.query(
      `INSERT INTO user_benefits (user_id, title, description, status, expires_at)
       VALUES (?, ?, ?, 'active', ?)`,
      [userId, title, description, expiresAt],
    );

    return res.status(201).json({ message: "Benefit issued successfully", id: result.insertId });
  } catch (error) {
    console.error("POST /admin/users/:userId/benefits error:", error);
    return res.status(500).json({ message: "Unable to issue benefit" });
  }
}

async function issueGiftCode(req, res) {
  try {
    await ensureAccountAdminTables();
    const userId = Number(req.params.userId);
    const code = String(req.body.code || "").trim().toUpperCase();
    const description = String(req.body.description || "").trim() || null;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (!/^[A-Z0-9._-]{4,80}$/.test(code)) {
      return res.status(400).json({ message: "Gift code format is invalid" });
    }

    const [result] = await db.query(
      `INSERT INTO gift_codes (user_id, code, description, status)
       VALUES (?, ?, ?, 'available')`,
      [userId, code, description],
    );

    return res.status(201).json({ message: "Gift code issued successfully", id: result.insertId });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Gift code already exists for this user" });
    }

    console.error("POST /admin/users/:userId/gift-codes error:", error);
    return res.status(500).json({ message: "Unable to issue gift code" });
  }
}

async function listCoinTopups(req, res) {
  try {
    await ensureAccountAdminTables();
    const status = String(req.query.status || "pending").trim();
    const params = [];
    let where = "";

    if (status !== "all") {
      if (!["pending", "paid", "failed", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid topup status" });
      }
      where = "WHERE cto.status = ?";
      params.push(status);
    }

    const [rows] = await db.query(
      `SELECT
         cto.id,
         cto.user_id,
         u.name,
         u.email,
         cto.package_id,
         cto.coins,
         cto.price,
         cto.status,
         cto.provider_ref,
         cto.paid_at,
         cto.created_at,
         cto.updated_at
       FROM coin_topup_orders cto
       JOIN users u ON u.id = cto.user_id
       ${where}
       ORDER BY cto.created_at DESC, cto.id DESC`,
      params,
    );

    return res.json({ items: rows });
  } catch (error) {
    console.error("GET /admin/coin-topups error:", error);
    return res.status(500).json({ message: "Unable to load coin topups" });
  }
}

async function updateCoinTopup(req, res) {
  const connection = await db.getConnection();

  try {
    await ensureAccountAdminTables();
    const topupId = Number(req.params.id);
    const status = String(req.body.status || "").trim();
    const providerRef = String(req.body.provider_ref || req.body.note || "").trim() || null;

    if (!Number.isInteger(topupId) || topupId <= 0) {
      return res.status(400).json({ message: "Invalid topup id" });
    }

    if (!["paid", "failed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid topup status" });
    }

    await connection.beginTransaction();

    const [topups] = await connection.query(
      `SELECT id, user_id, coins, status
       FROM coin_topup_orders
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [topupId],
    );

    const topup = topups[0];
    if (!topup) {
      await connection.rollback();
      return res.status(404).json({ message: "Coin topup not found" });
    }

    if (topup.status === "paid") {
      await connection.commit();
      return res.json({ message: "Coin topup was already paid", status: "paid" });
    }

    if (status === "paid") {
      await connection.query(
        "INSERT IGNORE INTO coin_wallets (user_id, balance) VALUES (?, 0)",
        [topup.user_id],
      );
      await connection.query(
        "UPDATE coin_wallets SET balance = balance + ? WHERE user_id = ?",
        [topup.coins, topup.user_id],
      );
      const [walletRows] = await connection.query(
        "SELECT balance FROM coin_wallets WHERE user_id = ? LIMIT 1",
        [topup.user_id],
      );
      const balanceAfter = Number(walletRows[0]?.balance || 0);

      await connection.query(
        `INSERT INTO coin_transactions
         (user_id, type, amount, balance_after, ref_type, ref_id, description)
         VALUES (?, 'topup', ?, ?, 'manual_payment', ?, ?)`,
        [topup.user_id, topup.coins, balanceAfter, topup.id, providerRef || `Manual topup #${topup.id}`],
      );

      await connection.query(
        `UPDATE coin_topup_orders
         SET status = 'paid', provider_ref = ?, paid_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [providerRef, topup.id],
      );
    } else {
      await connection.query(
        `UPDATE coin_topup_orders
         SET status = ?, provider_ref = ?, updated_at = NOW()
         WHERE id = ?`,
        [status, providerRef, topup.id],
      );
    }

    await connection.commit();
    return res.json({ message: "Coin topup updated successfully", status });
  } catch (error) {
    await connection.rollback();
    console.error("PUT /admin/coin-topups/:id error:", error);
    return res.status(500).json({ message: "Unable to update coin topup" });
  } finally {
    connection.release();
  }
}

router.get("/", verifyToken, requireAdmin, listUsers);
router.get("/users", verifyToken, requireAdmin, listUsers);

router.put("/:id/status", verifyToken, requireAdmin, updateUserStatus);
router.put("/users/:id/status", verifyToken, requireAdmin, updateUserStatus);
router.patch("/:id/status", verifyToken, requireAdmin, updateUserStatus);
router.patch("/users/:id/status", verifyToken, requireAdmin, updateUserStatus);

router.put("/:id/role", verifyToken, requireSuperAdmin, updateUserRole);
router.put("/users/:id/role", verifyToken, requireSuperAdmin, updateUserRole);
router.patch("/:id/role", verifyToken, requireSuperAdmin, updateUserRole);
router.patch("/users/:id/role", verifyToken, requireSuperAdmin, updateUserRole);
router.patch("/users/:id/approve-admin", verifyToken, requireSuperAdmin, approveAdmin);
router.patch("/users/:id/revoke-admin", verifyToken, requireSuperAdmin, revokeAdmin);

router.get("/age-verifications", verifyToken, requireAdmin, listAgeVerifications);
router.put("/age-verifications/:userId", verifyToken, requireAdmin, updateAgeVerification);
router.patch("/age-verifications/:userId", verifyToken, requireAdmin, updateAgeVerification);
router.post("/users/:userId/benefits", verifyToken, requireAdmin, issueBenefit);
router.post("/users/:userId/gift-codes", verifyToken, requireAdmin, issueGiftCode);
router.get("/coin-topups", verifyToken, requireAdmin, listCoinTopups);
router.put("/coin-topups/:id", verifyToken, requireAdmin, updateCoinTopup);
router.patch("/coin-topups/:id", verifyToken, requireAdmin, updateCoinTopup);

module.exports = router;
