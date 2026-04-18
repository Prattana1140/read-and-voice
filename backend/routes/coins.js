const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

const TOPUP_PACKAGES = [
  { id: "starter", coins: 100, price: 100, label: "Starter 100 coins" },
  { id: "reader", coins: 300, price: 279, label: "Reader 300 coins" },
  { id: "power", coins: 700, price: 599, label: "Power 700 coins" },
  { id: "mega", coins: 1500, price: 1199, label: "Mega 1500 coins" },
];

async function ensureWallet(connection, userId) {
  await connection.query(
    "INSERT IGNORE INTO coin_wallets (user_id, balance) VALUES (?, 0)",
    [userId]
  );
}

async function getBalance(connection, userId) {
  await ensureWallet(connection, userId);

  const [rows] = await connection.query(
    "SELECT balance FROM coin_wallets WHERE user_id = ? LIMIT 1",
    [userId]
  );

  return Number(rows[0]?.balance || 0);
}

router.get("/packages", (_req, res) => {
  return res.json(TOPUP_PACKAGES);
});

router.get("/wallet", verifyToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    const balance = await getBalance(connection, req.user.id);
    return res.json({ balance });
  } catch (error) {
    console.error("GET /coins/wallet error:", error);
    return res.status(500).json({ message: "โหลดกระเป๋า coin ไม่สำเร็จ" });
  } finally {
    connection.release();
  }
});

router.get("/transactions", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, type, amount, balance_after, ref_type, ref_id, description, created_at
       FROM coin_transactions
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 50`,
      [req.user.id]
    );

    return res.json(rows);
  } catch (error) {
    console.error("GET /coins/transactions error:", error);
    return res.status(500).json({ message: "โหลดประวัติ coin ไม่สำเร็จ" });
  }
});

router.post("/topup", verifyToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.id;
    const { package_id, coins } = req.body;
    const selectedPackage = TOPUP_PACKAGES.find((item) => item.id === package_id);
    const amount = selectedPackage ? selectedPackage.coins : Number(coins || 0);

    if (!Number.isInteger(amount) || amount <= 0 || amount > 50000) {
      return res.status(400).json({ message: "จำนวน coin ไม่ถูกต้อง" });
    }

    await connection.beginTransaction();
    await ensureWallet(connection, userId);

    await connection.query(
      "UPDATE coin_wallets SET balance = balance + ? WHERE user_id = ?",
      [amount, userId]
    );

    const balanceAfter = await getBalance(connection, userId);

    await connection.query(
      `INSERT INTO coin_transactions
       (user_id, type, amount, balance_after, ref_type, description)
       VALUES (?, 'topup', ?, ?, 'mock_payment', ?)`,
      [
        userId,
        amount,
        balanceAfter,
        selectedPackage ? selectedPackage.label : "Manual coin top up",
      ]
    );

    await connection.commit();

    return res.json({
      message: "เติม coin สำเร็จ",
      balance: balanceAfter,
      coins: amount,
    });
  } catch (error) {
    await connection.rollback();
    console.error("POST /coins/topup error:", error);
    return res.status(500).json({ message: "เติม coin ไม่สำเร็จ" });
  } finally {
    connection.release();
  }
});

module.exports = router;
