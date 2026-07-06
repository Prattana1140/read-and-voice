const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();
const slipUploadDir = path.join(__dirname, "../uploads/payment-slips");

fs.mkdirSync(slipUploadDir, { recursive: true });

const slipStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, slipUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `coin-topup-${req.params.id || "new"}-${Date.now()}${ext}`);
  },
});

const uploadSlip = multer({
  storage: slipStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      cb(new Error("อัปโหลดได้เฉพาะไฟล์รูปภาพสลิปเท่านั้น"));
      return;
    }
    cb(null, true);
  },
});

const TOPUP_PACKAGES = [
  { id: "coin_20", coins: 20, price: 20, label: "20 coins" },
  { id: "coin_50", coins: 50, price: 50, label: "50 coins" },
  { id: "coin_100", coins: 100, price: 100, label: "100 coins" },
  { id: "coin_250", coins: 250, price: 250, label: "250 coins" },
  { id: "coin_500", coins: 500, price: 500, label: "500 coins" },
];

let topupTablesReady;

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

function getQrImageUrl(topupOrder) {
  const template = String(process.env.MANUAL_PAYMENT_QR_IMAGE_URL || "").trim();
  if (template) {
    return template.replace(/\{(topup_id|order_id|amount|coins|package_id)\}/g, (_match, key) => {
      const values = {
        topup_id: topupOrder.id,
        order_id: topupOrder.id,
        amount: topupOrder.price,
        coins: topupOrder.coins,
        package_id: topupOrder.package_id || "",
      };
      return encodeURIComponent(String(values[key]));
    });
  }

  const promptPayId = String(process.env.PROMPTPAY_ID || "").replace(/[^\d]/g, "");
  if (!promptPayId) return null;

  return `https://promptpay.io/${promptPayId}/${Number(topupOrder.price).toFixed(2)}.png`;
}

async function ensureTopupTables(connection = db) {
  if (connection === db && topupTablesReady) return topupTablesReady;

  const work = (async () => {
    await connection.query(`
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
        CONSTRAINT fk_coin_topup_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await trySchemaUpdate(
      connection,
      "ALTER TABLE coin_topup_orders ADD COLUMN payer_name VARCHAR(191) NULL AFTER provider_ref",
    );
    await trySchemaUpdate(
      connection,
      "ALTER TABLE coin_topup_orders ADD COLUMN transfer_amount DECIMAL(10,2) NULL AFTER payer_name",
    );
    await trySchemaUpdate(
      connection,
      "ALTER TABLE coin_topup_orders ADD COLUMN transfer_date DATE NULL AFTER transfer_amount",
    );
    await trySchemaUpdate(
      connection,
      "ALTER TABLE coin_topup_orders ADD COLUMN transfer_time VARCHAR(10) NULL AFTER transfer_date",
    );
    await trySchemaUpdate(
      connection,
      "ALTER TABLE coin_topup_orders ADD COLUMN slip_image_url TEXT NULL AFTER transfer_time",
    );

    return true;
  })();

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

    const hasManualPaymentConfig =
      isManualPaymentEnabled() ||
      Boolean(String(process.env.PROMPTPAY_ID || process.env.MANUAL_PAYMENT_QR_IMAGE_URL || "").trim());

    if (!hasManualPaymentConfig) {
      return res.status(503).json({
        message: "ยังไม่ได้ตั้งค่า manual payment สำหรับเติม coin จริง",
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
      message: "สร้างรายการเติม coin แล้ว กรุณาโอนเงินและรอ admin อนุมัติ",
      topup_id: topupOrder.id,
      coins: topupOrder.coins,
      amount: topupOrder.price,
      price: topupOrder.price,
      payment_status: "pending",
      checkout_url: null,
      payment_instructions: getManualPaymentInstructions(topupOrder),
      qr_image_url: getQrImageUrl(topupOrder),
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
      `SELECT id, package_id, coins, price, status, provider_ref, payer_name, transfer_amount, transfer_date, transfer_time, slip_image_url, paid_at, created_at, updated_at
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

router.patch("/topups/:id/confirm", verifyToken, uploadSlip.single("slip"), async (req, res) => {
  try {
    await ensureTopupTables();
    const topupId = Number(req.params.id);
    const providerRef = String(req.body.provider_ref || req.body.note || "").trim();
    const payerName = String(req.body.payer_name || "").trim();
    const transferAmount = Number(req.body.transfer_amount || 0);
    const transferDate = String(req.body.transfer_date || "").trim();
    const transferTime = String(req.body.transfer_time || "").trim();
    const slipImageUrl = req.file ? `/uploads/payment-slips/${req.file.filename}` : "";

    if (!Number.isInteger(topupId) || topupId <= 0) {
      return res.status(400).json({ message: "topup id ไม่ถูกต้อง" });
    }

    if (!providerRef) {
      return res.status(400).json({ message: "กรุณากรอกเลขอ้างอิงหรือหมายเหตุการโอน" });
    }

    if (!payerName) {
      return res.status(400).json({ message: "กรุณากรอกชื่อผู้โอนหรือชื่อบัญชีที่ใช้โอน" });
    }

    if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ message: "กรุณากรอกยอดโอนให้ถูกต้อง" });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(transferDate)) {
      return res.status(400).json({ message: "กรุณาเลือกวันที่โอน" });
    }

    if (!/^\d{2}:\d{2}$/.test(transferTime)) {
      return res.status(400).json({ message: "กรุณาเลือกเวลาโอน" });
    }

    if (!slipImageUrl) {
      return res.status(400).json({ message: "กรุณาแนบรูปภาพสลิปการโอน" });
    }

    const [topups] = await db.query(
      `SELECT id, status
       FROM coin_topup_orders
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [topupId, req.user.id],
    );

    const topup = topups[0];
    if (!topup) {
      return res.status(404).json({ message: "ไม่พบรายการเติม coin" });
    }

    if (topup.status === "paid") {
      return res.json({ message: "รายการนี้ได้รับการอนุมัติแล้ว", status: "paid" });
    }

    if (topup.status !== "pending") {
      return res.status(400).json({ message: "รายการนี้ไม่อยู่ในสถานะรอชำระเงิน" });
    }

    await db.query(
      `UPDATE coin_topup_orders
       SET provider_ref = ?, payer_name = ?, transfer_amount = ?, transfer_date = ?, transfer_time = ?, slip_image_url = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [providerRef, payerName, transferAmount, transferDate, transferTime, slipImageUrl, topupId, req.user.id],
    );

    return res.json({
      message: "บันทึกข้อมูลการโอนแล้ว รอแอดมินตรวจสอบและอนุมัติ",
      status: "pending",
    });
  } catch (error) {
    console.error("PATCH /coins/topups/:id/confirm error:", error);
    return res.status(500).json({ message: "บันทึกข้อมูลการโอนไม่สำเร็จ" });
  }
});

module.exports = router;
