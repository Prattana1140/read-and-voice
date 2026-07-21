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

async function trySchemaUpdate(connection, sql, ignoredMessages = ["Duplicate column"]) {
  try {
    await connection.query(sql);
  } catch (error) {
    const message = String(error.message || "");
    if (!ignoredMessages.some((ignored) => message.includes(ignored))) {
      throw error;
    }
  }
}

async function ensureAccountAdminTables() {
  if (!accountAdminTablesReady) {
    accountAdminTablesReady = (async () => {
      await Promise.all([
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
            payer_name VARCHAR(191) NULL,
            transfer_amount DECIMAL(10,2) NULL,
            transfer_date DATE NULL,
            transfer_time VARCHAR(10) NULL,
            slip_image_url TEXT NULL,
            paid_at DATETIME NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_coin_topup_orders_user (user_id),
            INDEX idx_coin_topup_orders_status (status),
            CONSTRAINT fk_admin_coin_topup_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `),
      ]);

      await trySchemaUpdate(
        db,
        "ALTER TABLE coin_topup_orders ADD COLUMN payer_name VARCHAR(191) NULL AFTER provider_ref",
      );
      await trySchemaUpdate(
        db,
        "ALTER TABLE coin_topup_orders ADD COLUMN transfer_amount DECIMAL(10,2) NULL AFTER payer_name",
      );
      await trySchemaUpdate(
        db,
        "ALTER TABLE coin_topup_orders ADD COLUMN transfer_date DATE NULL AFTER transfer_amount",
      );
      await trySchemaUpdate(
        db,
        "ALTER TABLE coin_topup_orders ADD COLUMN transfer_time VARCHAR(10) NULL AFTER transfer_date",
      );
      await trySchemaUpdate(
        db,
        "ALTER TABLE coin_topup_orders ADD COLUMN slip_image_url TEXT NULL AFTER transfer_time",
      );

      return true;
    })();
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
         cto.payer_name,
         cto.transfer_amount,
         cto.transfer_date,
         cto.transfer_time,
         cto.slip_image_url,
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

async function addOrderItemsToLibrary(connection, orderId, userId) {
  const [items] = await connection.query(
    `SELECT book_id
     FROM order_items
     WHERE order_id = ?`,
    [orderId],
  );

  for (const item of items) {
    if (item.book_id) {
      await connection.query(
        "INSERT IGNORE INTO `library` (user_id, book_id) VALUES (?, ?)",
        [userId, item.book_id],
      );
    }
  }
}

async function listPaymentApprovals(req, res) {
  try {
    await ensureAccountAdminTables();
    const status = String(req.query.status || "pending").trim();
    const params = [];
    const topupParams = [];
    const orderParams = [];
    const subscriptionParams = [];

    let topupWhere = "";
    let orderWhere = "";
    let subscriptionWhere = "";

    if (status !== "all") {
      if (!["pending", "paid", "failed", "cancelled", "completed"].includes(status)) {
        return res.status(400).json({ message: "Invalid payment status" });
      }

      topupWhere = "WHERE cto.status = ?";
      topupParams.push(status === "completed" ? "paid" : status);
      orderWhere = "WHERE o.payment_status = ?";
      orderParams.push(status === "completed" ? "paid" : status);
      subscriptionWhere = "WHERE us.payment_status = ?";
      subscriptionParams.push(status === "completed" ? "paid" : status);
    }

    const [topups] = await db.query(
      `SELECT
         'coin_topup' AS item_type,
         cto.id,
         cto.user_id,
         u.name,
         u.email,
         cto.package_id,
         cto.coins,
         cto.price AS amount,
         cto.status AS payment_status,
         cto.status AS item_status,
         cto.provider_ref,
         cto.payer_name,
         cto.transfer_amount,
         cto.transfer_date,
         cto.transfer_time,
         cto.slip_image_url,
         cto.paid_at,
         cto.created_at,
         cto.updated_at,
         NULL AS title,
         NULL AS detail
       FROM coin_topup_orders cto
       JOIN users u ON u.id = cto.user_id
       ${topupWhere}
       ORDER BY cto.created_at DESC, cto.id DESC
       LIMIT 200`,
      topupParams,
    );

    const [orders] = await db.query(
      `SELECT
         'order' AS item_type,
         o.id,
         o.user_id,
         u.name,
         u.email,
         NULL AS package_id,
         NULL AS coins,
         o.total_amount AS amount,
         o.payment_status,
         o.order_status AS item_status,
         o.payment_method AS provider_ref,
         NULL AS payer_name,
         NULL AS transfer_amount,
         NULL AS transfer_date,
         NULL AS transfer_time,
         NULL AS slip_image_url,
         NULL AS paid_at,
         o.created_at,
         o.created_at AS updated_at,
         GROUP_CONCAT(COALESCE(e.title, b.title) ORDER BY oi.id SEPARATOR ', ') AS title,
         CONCAT(COUNT(oi.id), ' item(s)') AS detail
       FROM orders o
       JOIN users u ON u.id = o.user_id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN books b ON b.id = oi.book_id
       LEFT JOIN book_episodes e ON e.id = oi.episode_id
       ${orderWhere}
       GROUP BY o.id
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT 200`,
      orderParams,
    );

    const [subscriptions] = await db.query(
      `SELECT
         'subscription' AS item_type,
         us.id,
         us.user_id,
         u.name,
         u.email,
         us.plan_id AS package_id,
         NULL AS coins,
         sp.price AS amount,
         us.payment_status,
         us.status AS item_status,
         sp.name AS provider_ref,
         NULL AS payer_name,
         NULL AS transfer_amount,
         NULL AS transfer_date,
         NULL AS transfer_time,
         NULL AS slip_image_url,
         NULL AS paid_at,
         us.created_at,
         us.updated_at,
         sp.name AS title,
         CONCAT(us.start_at, ' - ', us.end_at) AS detail
       FROM user_subscriptions us
       JOIN users u ON u.id = us.user_id
       JOIN subscription_plans sp ON sp.id = us.plan_id
       ${subscriptionWhere}
       ORDER BY us.created_at DESC, us.id DESC
       LIMIT 200`,
      subscriptionParams,
    );

    const items = [...topups, ...orders, ...subscriptions].sort((a, b) => {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    const [[topupSummary]] = await db.query(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'pending') AS pending,
         SUM(status = 'paid') AS paid,
         SUM(status = 'failed') AS failed,
         SUM(status = 'cancelled') AS cancelled
       FROM coin_topup_orders`,
    );
    const [[orderSummary]] = await db.query(
      `SELECT
         COUNT(*) AS total,
         SUM(payment_status = 'pending') AS pending,
         SUM(payment_status = 'paid') AS paid,
         SUM(payment_status = 'failed') AS failed,
         SUM(payment_status = 'cancelled') AS cancelled
       FROM orders`,
    );
    const [[subscriptionSummary]] = await db.query(
      `SELECT
         COUNT(*) AS total,
         SUM(payment_status = 'pending') AS pending,
         SUM(payment_status = 'paid') AS paid,
         SUM(payment_status = 'failed') AS failed,
         SUM(payment_status = 'cancelled') AS cancelled
       FROM user_subscriptions`,
    );
    const addCounts = (...rows) =>
      rows.reduce(
        (acc, row) => ({
          total: acc.total + Number(row?.total || 0),
          pending: acc.pending + Number(row?.pending || 0),
          paid: acc.paid + Number(row?.paid || 0),
          failed: acc.failed + Number(row?.failed || 0),
          cancelled: acc.cancelled + Number(row?.cancelled || 0),
        }),
        { total: 0, pending: 0, paid: 0, failed: 0, cancelled: 0 },
      );

    return res.json({
      items,
      summary: {
        ...addCounts(topupSummary, orderSummary, subscriptionSummary),
        by_type: {
          coin_topup: addCounts(topupSummary),
          order: addCounts(orderSummary),
          subscription: addCounts(subscriptionSummary),
        },
      },
    });
  } catch (error) {
    console.error("GET /admin/payment-approvals error:", error);
    return res.status(500).json({ message: "Unable to load payment approvals" });
  }
}

async function updateOrderPayment(connection, paymentId, status, note) {
  const [orders] = await connection.query(
    `SELECT id, user_id, payment_status
     FROM orders
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [paymentId],
  );
  const order = orders[0];

  if (!order) {
    const error = new Error("ORDER_NOT_FOUND");
    error.status = 404;
    throw error;
  }

  if (order.payment_status === "paid") {
    return { message: "Order was already paid", status: "paid" };
  }

  if (status === "paid") {
    await connection.query(
      `UPDATE orders
       SET payment_status = 'paid', order_status = 'completed'
       WHERE id = ?`,
      [paymentId],
    );
    await addOrderItemsToLibrary(connection, paymentId, order.user_id);
  } else {
    await connection.query(
      `UPDATE orders
       SET payment_status = ?, order_status = 'cancelled'
       WHERE id = ?`,
      [status, paymentId],
    );
  }

  return { message: note || "Order payment updated successfully", status };
}

async function updateSubscriptionPayment(connection, paymentId, status, note) {
  const [subscriptions] = await connection.query(
    `SELECT id, payment_status
     FROM user_subscriptions
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [paymentId],
  );
  const subscription = subscriptions[0];

  if (!subscription) {
    const error = new Error("SUBSCRIPTION_NOT_FOUND");
    error.status = 404;
    throw error;
  }

  if (subscription.payment_status === "paid") {
    return { message: "Subscription was already paid", status: "paid" };
  }

  if (status === "paid") {
    await connection.query(
      `UPDATE user_subscriptions
       SET payment_status = 'paid', status = 'active', updated_at = NOW()
       WHERE id = ?`,
      [paymentId],
    );
  } else {
    await connection.query(
      `UPDATE user_subscriptions
       SET payment_status = ?, status = 'cancelled', updated_at = NOW()
       WHERE id = ?`,
      [status, paymentId],
    );
  }

  return { message: note || "Subscription payment updated successfully", status };
}

async function updateCoinTopupPayment(connection, paymentId, status, note) {
  const [topups] = await connection.query(
    `SELECT id, user_id, coins, status, provider_ref, payer_name, transfer_amount, transfer_date, transfer_time, slip_image_url
     FROM coin_topup_orders
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [paymentId],
  );
  const topup = topups[0];

  if (!topup) {
    const error = new Error("TOPUP_NOT_FOUND");
    error.status = 404;
    throw error;
  }

  if (topup.status === "paid") {
    return { message: "Coin topup was already paid", status: "paid" };
  }

  if (status === "paid") {
    const hasTransferEvidence =
      topup.provider_ref &&
      topup.payer_name &&
      Number(topup.transfer_amount || 0) > 0 &&
      topup.transfer_date &&
      topup.transfer_time &&
      topup.slip_image_url;

    if (!hasTransferEvidence) {
      const error = new Error("TOPUP_TRANSFER_EVIDENCE_REQUIRED");
      error.status = 400;
      throw error;
    }

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
      [topup.user_id, topup.coins, balanceAfter, topup.id, note || `Manual topup #${topup.id}`],
    );

    await connection.query(
      `UPDATE coin_topup_orders
       SET status = 'paid', provider_ref = ?, paid_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [note, topup.id],
    );
  } else {
    await connection.query(
      `UPDATE coin_topup_orders
       SET status = ?, provider_ref = ?, updated_at = NOW()
       WHERE id = ?`,
      [status, note, topup.id],
    );
  }

  return { message: "Coin topup updated successfully", status };
}

async function updatePaymentApproval(req, res) {
  const connection = await db.getConnection();

  try {
    await ensureAccountAdminTables();
    const itemType = String(req.params.type || "").trim();
    const paymentId = Number(req.params.id);
    const status = String(req.body.status || "").trim();
    const note = String(req.body.provider_ref || req.body.note || "").trim() || null;

    if (!["coin_topup", "order", "subscription"].includes(itemType)) {
      return res.status(400).json({ message: "Invalid payment type" });
    }

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({ message: "Invalid payment id" });
    }

    if (!["paid", "failed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }

    await connection.beginTransaction();

    let result;
    if (itemType === "coin_topup") {
      result = await updateCoinTopupPayment(connection, paymentId, status, note);
    } else if (itemType === "order") {
      result = await updateOrderPayment(connection, paymentId, status, note);
    } else {
      result = await updateSubscriptionPayment(connection, paymentId, status, note);
    }

    await connection.commit();
    return res.json(result);
  } catch (error) {
    await connection.rollback();
    console.error("PATCH /admin/payment-approvals/:type/:id error:", error);
    return res.status(error.status || 500).json({
      message:
        error.message === "ORDER_NOT_FOUND"
          ? "Order not found"
          : error.message === "SUBSCRIPTION_NOT_FOUND"
            ? "Subscription not found"
            : error.message === "TOPUP_NOT_FOUND"
              ? "Coin topup not found"
              : error.message === "TOPUP_TRANSFER_EVIDENCE_REQUIRED"
                ? "ยังอนุมัติเติมเหรียญไม่ได้ เพราะผู้ใช้ยังแจ้งข้อมูลโอนเงินและแนบสลิปไม่ครบ"
            : "Unable to update payment approval",
    });
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
router.get("/payment-approvals", verifyToken, requireAdmin, listPaymentApprovals);
router.put("/payment-approvals/:type/:id", verifyToken, requireAdmin, updatePaymentApproval);
router.patch("/payment-approvals/:type/:id", verifyToken, requireAdmin, updatePaymentApproval);

module.exports = router;
