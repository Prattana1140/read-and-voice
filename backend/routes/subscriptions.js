const express = require("express");
const db = require("../config/db");
const { verifyToken, optionalVerifyToken } = require("../middleware/auth");

const router = express.Router();

let tablesReady;

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

async function ensureSubscriptionTables(connection = db) {
  if (connection === db && tablesReady) return tablesReady;

  const work = (async () => {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        duration_days INT NOT NULL DEFAULT 30,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_id INT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        payment_status VARCHAR(50) NOT NULL DEFAULT 'paid',
        start_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_subscriptions_user_id (user_id),
        CONSTRAINT fk_user_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await trySchemaUpdate(
      connection,
      "ALTER TABLE subscription_plans ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1"
    );

    await trySchemaUpdate(
      connection,
      "ALTER TABLE subscription_plans ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    );

    await connection.query(`
      INSERT INTO subscription_plans (name, description, price, duration_days)
      SELECT 'Monthly Plus', 'อ่านคอนเทนต์ subscription ได้ 30 วัน', 199.00, 30
      WHERE NOT EXISTS (SELECT 1 FROM subscription_plans LIMIT 1)
    `);

    return true;
  })();

  if (connection === db) {
    tablesReady = work.catch((error) => {
      tablesReady = undefined;
      throw error;
    });
    return tablesReady;
  }

  return work;
}

function normalizePlanDuration(value) {
  const days = Number(value);
  return Number.isInteger(days) && days > 0 ? days : 30;
}

router.get("/plans", async (_req, res) => {
  try {
    await ensureSubscriptionTables();
    const [rows] = await db.query(
      `SELECT id, name, description, price, duration_days, created_at
       FROM subscription_plans
       WHERE COALESCE(is_active, 1) = 1
       ORDER BY price ASC, id ASC`
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /subscriptions/plans error:", error);
    return res.status(500).json({ message: "โหลดแพ็กเกจไม่สำเร็จ" });
  }
});

router.get("/me", optionalVerifyToken, async (req, res) => {
  try {
    await ensureSubscriptionTables();
    if (!req.user) {
      return res.json({ isActive: false, subscription: null });
    }

    const [rows] = await db.query(
      `SELECT
         us.id,
         us.plan_id,
         us.status,
         us.payment_status,
         us.start_at,
         us.end_at,
         sp.name,
         sp.name AS plan_name,
         sp.description,
         sp.price,
         sp.duration_days
       FROM user_subscriptions us
       JOIN subscription_plans sp ON sp.id = us.plan_id
       WHERE us.user_id = ?
       ORDER BY us.end_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    const subscription = rows[0] || null;
    const isActive =
      !!subscription &&
      subscription.status === "active" &&
      subscription.payment_status === "paid" &&
      new Date(subscription.end_at).getTime() > Date.now();

    return res.json({ isActive, subscription });
  } catch (error) {
    console.error("GET /subscriptions/me error:", error);
    return res.status(500).json({ message: "โหลดสถานะสมาชิกไม่สำเร็จ" });
  }
});

async function ensureWallet(connection, userId) {
  await connection.query(
    "INSERT IGNORE INTO coin_wallets (user_id, balance) VALUES (?, 0)",
    [userId]
  );
}

async function debitCoins(connection, userId, amount, refType, refId, description) {
  await ensureWallet(connection, userId);

  const [walletRows] = await connection.query(
    "SELECT balance FROM coin_wallets WHERE user_id = ? FOR UPDATE",
    [userId]
  );
  const balance = Number(walletRows[0]?.balance || 0);

  if (balance < amount) {
    const error = new Error("COINS_NOT_ENOUGH");
    error.balance = balance;
    throw error;
  }

  const balanceAfter = balance - amount;

  await connection.query(
    "UPDATE coin_wallets SET balance = ? WHERE user_id = ?",
    [balanceAfter, userId]
  );
  await connection.query(
    `INSERT INTO coin_transactions
     (user_id, type, amount, balance_after, ref_type, ref_id, description)
     VALUES (?, 'purchase', ?, ?, ?, ?, ?)`,
    [userId, -amount, balanceAfter, refType, refId, description]
  );

  return balanceAfter;
}

async function checkoutSubscription(req, res) {
  const connection = await db.getConnection();
  let transactionStarted = false;

  try {
    const userId = req.user.id;
    const planId = req.body.planId || req.body.plan_id;

    if (!planId) {
      return res.status(400).json({ message: "กรุณาเลือกแพ็กเกจ" });
    }

    await ensureSubscriptionTables(connection);

    const [plans] = await connection.query(
      "SELECT * FROM subscription_plans WHERE id = ? LIMIT 1",
      [planId]
    );
    const plan = plans[0];

    if (!plan) {
      return res.status(404).json({ message: "ไม่พบแพ็กเกจ" });
    }

    const coinCost = Math.max(0, Math.ceil(Number(plan.price || 0)));
    const durationDays = normalizePlanDuration(plan.duration_days);

    await connection.beginTransaction();
    transactionStarted = true;

    const balanceAfter = await debitCoins(
      connection,
      userId,
      coinCost,
      "subscription_plan",
      plan.id,
      `Subscribe ${plan.name}`
    );

    await connection.query(
      `UPDATE user_subscriptions
       SET status = 'expired'
       WHERE user_id = ? AND status = 'active' AND end_at <= NOW()`,
      [userId]
    );

    const [activeSubscriptions] = await connection.query(
      `SELECT id, end_at
       FROM user_subscriptions
       WHERE user_id = ?
         AND status = 'active'
         AND payment_status = 'paid'
         AND end_at > NOW()
       ORDER BY end_at DESC
       FOR UPDATE`,
      [userId]
    );
    const extensionBaseDate = activeSubscriptions[0]?.end_at || null;
    const supersededIds = activeSubscriptions.map((subscription) => subscription.id);

    if (supersededIds.length > 0) {
      await connection.query(
        `UPDATE user_subscriptions
         SET status = 'cancelled'
         WHERE user_id = ?
           AND id IN (?)`,
        [userId, supersededIds]
      );
    }

    await connection.query(
      `INSERT INTO user_subscriptions
       (user_id, plan_id, status, payment_status, start_at, end_at)
       VALUES (?, ?, 'active', 'paid', NOW(), DATE_ADD(COALESCE(?, NOW()), INTERVAL ? DAY))`,
      [userId, plan.id, extensionBaseDate, durationDays]
    );

    await connection.commit();

    return res.json({
      message: "สมัครแพ็กเกจสำเร็จ",
      balance: balanceAfter,
      plan,
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    if (error.message === "COINS_NOT_ENOUGH") {
      return res.status(402).json({
        message: "coin ไม่พอ กรุณาเติม coin ก่อน",
        balance: error.balance,
      });
    }

    console.error("POST /subscriptions/checkout error:", error);
    return res.status(500).json({ message: "สมัครแพ็กเกจไม่สำเร็จ" });
  } finally {
    connection.release();
  }
}

router.post("/checkout", verifyToken, checkoutSubscription);

router.post("/subscribe", verifyToken, (req, res) => {
  req.body.planId = req.body.plan_id || req.body.planId;
  return checkoutSubscription(req, res);
});

module.exports = router;
