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

let topupTablesReady;

function isProduction() {
  return String(process.env.NODE_ENV || "").toLowerCase() === "production";
}

function isMockCoinTopupEnabled() {
  return !isProduction() || /^(1|true|yes)$/i.test(process.env.ENABLE_MOCK_COIN_TOPUP || "");
}

function isManualPaymentEnabled() {
  return /^(1|true|yes)$/i.test(process.env.MANUAL_PAYMENT_ENABLED || "");
}

function getManualPaymentInstructions(topupOrder) {
  const instructions = String(process.env.MANUAL_PAYMENT_INSTRUCTIONS || "").trim();
  if (!instructions) return null;

  return instructions.replace(/\{(topup_id|order_id|amount|coins)\}/g, (_match, key) => {
    const values = {
      topup_id: topupOrder.id,
      order_id: topupOrder.id,
      amount: topupOrder.price,
      coins: topupOrder.coins,
    };
    return String(values[key]);
  });
}

function getCheckoutUrl(topupOrder) {
  const template = String(process.env.PAYMENT_CHECKOUT_URL_TEMPLATE || "").trim();
  if (!template) return null;

  const values = {
    topup_id: topupOrder.id,
    order_id: topupOrder.id,
    user_id: topupOrder.user_id,
    amount: topupOrder.price,
    coins: topupOrder.coins,
    package_id: topupOrder.package_id || "",
  };

  return template.replace(/\{(topup_id|order_id|user_id|amount|coins|package_id)\}/g, (_match, key) => {
    return encodeURIComponent(String(values[key]));
  });
}

async function ensureTopupTables(connection = db) {
  if (connection === db && topupTablesReady) return topupTablesReady;

  const work = connection.query(`
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
      CONSTRAINT fk_coin_topup_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).then(() => true);

  if (connection === db) {
    topupTablesReady = work.catch((error) => {
      topupTablesReady = undefined;
      throw error;
    });
    return topupTablesReady;
  }

  return work;
}

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
    const price = selectedPackage ? selectedPackage.price : amount;

    if (!Number.isInteger(amount) || amount <= 0 || amount > 50000) {
      return res.status(400).json({ message: "จำนวน coin ไม่ถูกต้อง" });
    }

    await ensureTopupTables(connection);

    if (!isMockCoinTopupEnabled()) {
      const hasCheckoutTemplate = Boolean(process.env.PAYMENT_CHECKOUT_URL_TEMPLATE);

      if (!hasCheckoutTemplate && !isManualPaymentEnabled()) {
        return res.status(503).json({
          message: "ยังไม่ได้ตั้งค่า payment gateway หรือ manual payment สำหรับเติม coin จริง",
        });
      }

      const [result] = await connection.query(
        `INSERT INTO coin_topup_orders (user_id, package_id, coins, price, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [userId, selectedPackage?.id || null, amount, price],
      );
      const topupOrder = {
        id: result.insertId,
        user_id: userId,
        package_id: selectedPackage?.id || null,
        coins: amount,
        price,
      };

      return res.status(202).json({
        message: hasCheckoutTemplate
          ? "สร้างรายการเติม coin แล้ว กรุณาชำระเงินผ่าน payment gateway"
          : "สร้างรายการเติม coin แล้ว กรุณาโอนเงินและรอ admin อนุมัติ",
        topup_id: topupOrder.id,
        payment_status: "pending",
        checkout_url: hasCheckoutTemplate ? getCheckoutUrl(topupOrder) : null,
        payment_instructions: hasCheckoutTemplate ? null : getManualPaymentInstructions(topupOrder),
      });
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

router.get("/topups/:id", verifyToken, async (req, res) => {
  try {
    await ensureTopupTables();
    const topupId = Number(req.params.id);

    if (!Number.isInteger(topupId) || topupId <= 0) {
      return res.status(400).json({ message: "topup id ไม่ถูกต้อง" });
    }

    const [rows] = await db.query(
      `SELECT id, package_id, coins, price, status, provider_ref, paid_at, created_at, updated_at
       FROM coin_topup_orders
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [topupId, req.user.id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "ไม่พบรายการเติม coin" });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("GET /coins/topups/:id error:", error);
    return res.status(500).json({ message: "โหลดสถานะเติม coin ไม่สำเร็จ" });
  }
});

module.exports = router;
