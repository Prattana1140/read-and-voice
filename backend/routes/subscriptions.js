const express = require("express");
const db = require("../config/db");
const { verifyToken, optionalVerifyToken } = require("../middleware/auth");

const router = express.Router();

router.get("/plans", async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, description, price, duration_days, created_at
       FROM subscription_plans
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

  try {
    const userId = req.user.id;
    const planId = req.body.planId || req.body.plan_id;

    if (!planId) {
      return res.status(400).json({ message: "กรุณาเลือกแพ็กเกจ" });
    }

    const [plans] = await connection.query(
      "SELECT * FROM subscription_plans WHERE id = ? LIMIT 1",
      [planId]
    );
    const plan = plans[0];

    if (!plan) {
      return res.status(404).json({ message: "ไม่พบแพ็กเกจ" });
    }

    const coinCost = Math.max(0, Math.ceil(Number(plan.price || 0)));

    await connection.beginTransaction();

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

    await connection.query(
      `INSERT INTO user_subscriptions
       (user_id, plan_id, status, payment_status, start_at, end_at)
       VALUES (?, ?, 'active', 'paid', NOW(), DATE_ADD(NOW(), INTERVAL ? DAY))`,
      [userId, plan.id, Number(plan.duration_days || 30)]
    );

    await connection.commit();

    return res.json({
      message: "สมัครแพ็กเกจสำเร็จ",
      balance: balanceAfter,
      plan,
    });
  } catch (error) {
    await connection.rollback();

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
