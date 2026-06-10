const express = require("express");
const crypto = require("crypto");

const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

let topupTablesReady;

function getMockWebhookSecret() {
  return String(process.env.MOCK_PAYMENT_WEBHOOK_SECRET || "").trim();
}

function getPaymentWebhookSecret() {
  return String(process.env.PAYMENT_WEBHOOK_SECRET || "").trim();
}

function isProduction() {
  return String(process.env.NODE_ENV || "").toLowerCase() === "production";
}

function isMockPaymentEnabled() {
  if (isProduction()) return false;
  return !/^(0|false|no)$/i.test(process.env.ENABLE_MOCK_PAYMENTS || "");
}

function hasMatchingSecret(req, headerName, configuredSecret) {
  if (!configuredSecret) return false;

  const headerSecret = String(req.headers[headerName] || "");
  if (!headerSecret) return false;

  const configuredBuffer = Buffer.from(configuredSecret, "utf8");
  const headerBuffer = Buffer.from(headerSecret, "utf8");

  if (configuredBuffer.length !== headerBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(configuredBuffer, headerBuffer);
}

function hasValidMockWebhookSecret(req) {
  const configuredSecret = getMockWebhookSecret();
  if (!configuredSecret) return !isProduction();

  return hasMatchingSecret(req, "x-mock-webhook-secret", configuredSecret);
}

function ensureMockWebhookAuthorized(req, res) {
  const configuredSecret = getMockWebhookSecret();

  if (!isMockPaymentEnabled()) {
    res.status(503).json({
      message: "mock payment ถูกปิดใน production",
    });
    return false;
  }

  if (!configuredSecret && isProduction()) {
    res.status(503).json({
      message: "ปิดการใช้งาน mock webhook ใน production เพราะยังไม่ได้ตั้งค่า secret",
    });
    return false;
  }

  if (!hasValidMockWebhookSecret(req)) {
    res.status(401).json({
      message: configuredSecret
        ? "x-mock-webhook-secret ไม่ถูกต้อง"
        : "mock webhook อนุญาตเฉพาะ non-production หรือเมื่อกำหนด secret แล้ว",
    });
    return false;
  }

  return true;
}

function ensureRealPaymentWebhookAuthorized(req, res) {
  const configuredSecret = getPaymentWebhookSecret();

  if (!configuredSecret) {
    res.status(503).json({
      message: "ยังไม่ได้ตั้งค่า PAYMENT_WEBHOOK_SECRET",
    });
    return false;
  }

  if (!hasMatchingSecret(req, "x-payment-webhook-secret", configuredSecret)) {
    res.status(401).json({ message: "payment webhook secret ไม่ถูกต้อง" });
    return false;
  }

  return true;
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

async function addBookToLibrary(connection, userId, bookId) {
  if (!bookId) return;

  await connection.query(
    "INSERT IGNORE INTO `library` (user_id, book_id) VALUES (?, ?)",
    [userId, bookId],
  );
}

router.post("/mock/create", verifyToken, async (req, res) => {
  if (!isMockPaymentEnabled()) {
    return res.status(503).json({
      message: "mock payment ถูกปิดใน production",
    });
  }

  const connection = await db.getConnection();

  try {
    const userId = req.user.id;
    const { book_id, episode_id } = req.body;

    if (!book_id && !episode_id) {
      return res.status(400).json({
        message: "ต้องระบุหนังสือหรือตอนที่ต้องการชำระ",
      });
    }

    let item = null;

    if (episode_id) {
      const [rows] = await connection.query(
        `SELECT e.id AS episode_id, e.book_id, e.price, e.title, b.title AS book_title
         FROM book_episodes e
         JOIN books b ON b.id = e.book_id
         WHERE e.id = ?
         LIMIT 1`,
        [episode_id],
      );

      if (!rows.length) {
        return res.status(404).json({ message: "ไม่พบตอนที่ต้องการชำระ" });
      }

      item = rows[0];
    } else {
      const [rows] = await connection.query(
        `SELECT id AS book_id, price, title
         FROM books
         WHERE id = ?
         LIMIT 1`,
        [book_id],
      );

      if (!rows.length) {
        return res.status(404).json({ message: "ไม่พบหนังสือที่ต้องการชำระ" });
      }

      item = rows[0];
    }

    await connection.beginTransaction();

    const totalAmount = Number(item.price || 0);
    const [orderResult] = await connection.query(
      `INSERT INTO orders
       (user_id, total_amount, payment_method, payment_status, order_status)
       VALUES (?, ?, 'mock_gateway', 'pending', 'pending')`,
      [userId, totalAmount],
    );

    const orderId = orderResult.insertId;

    await connection.query(
      `INSERT INTO order_items (order_id, book_id, episode_id, quantity, price)
       VALUES (?, ?, ?, 1, ?)`,
      [
        orderId,
        item.book_id || null,
        item.episode_id || null,
        totalAmount,
      ],
    );

    await connection.commit();

    return res.json({
      message: "สร้าง mock payment สำเร็จ",
      order_id: orderId,
      payment_status: "pending",
      mock_payment_url: `/payments/mock/${orderId}`,
    });
  } catch (error) {
    await connection.rollback();
    console.error("POST /payments/mock/create error:", error);
    return res.status(500).json({ message: "สร้าง mock payment ไม่สำเร็จ" });
  } finally {
    connection.release();
  }
});

router.post("/topup/webhook", async (req, res) => {
  if (!ensureRealPaymentWebhookAuthorized(req, res)) {
    return;
  }

  const connection = await db.getConnection();

  try {
    await ensureTopupTables(connection);

    const topupId = Number(req.body.topup_id || req.body.order_id);
    const status = String(req.body.status || "paid").toLowerCase();
    const providerRef = String(req.body.provider_ref || req.body.transaction_id || "").trim() || null;

    if (!Number.isInteger(topupId) || topupId <= 0) {
      return res.status(400).json({ message: "topup_id ไม่ถูกต้อง" });
    }

    if (!["paid", "failed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "status ไม่ถูกต้อง" });
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

    if (!topups.length) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบรายการเติม coin" });
    }

    const topup = topups[0];

    if (topup.status === "paid") {
      await connection.commit();
      return res.json({ message: "รายการนี้ชำระแล้ว", topup_id: topupId, status: "paid" });
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
         VALUES (?, 'topup', ?, ?, 'payment_gateway', ?, ?)`,
        [topup.user_id, topup.coins, balanceAfter, topup.id, providerRef || `Top up #${topup.id}`],
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
    return res.json({ message: "รับ payment webhook สำเร็จ", topup_id: topupId, status });
  } catch (error) {
    await connection.rollback();
    console.error("POST /payments/topup/webhook error:", error);
    return res.status(500).json({ message: "ประมวลผล payment webhook ไม่สำเร็จ" });
  } finally {
    connection.release();
  }
});

router.post("/mock/webhook", async (req, res) => {
  if (!ensureMockWebhookAuthorized(req, res)) {
    return;
  }

  const connection = await db.getConnection();

  try {
    const orderId = Number(req.body.order_id);
    const status = String(req.body.status || "paid").toLowerCase();

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "order_id ไม่ถูกต้อง" });
    }

    if (!["paid", "failed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "status ไม่ถูกต้อง" });
    }

    await connection.beginTransaction();

    const [orders] = await connection.query(
      `SELECT id, user_id, payment_status, order_status
       FROM orders
       WHERE id = ?
       LIMIT 1`,
      [orderId],
    );

    if (!orders.length) {
      await connection.rollback();
      return res.status(404).json({ message: "ไม่พบ order นี้" });
    }

    if (status === "paid") {
      await connection.query(
        `UPDATE orders
         SET payment_status = 'paid',
             order_status = 'completed'
         WHERE id = ?`,
        [orderId],
      );

      const [items] = await connection.query(
        `SELECT book_id
         FROM order_items
         WHERE order_id = ?`,
        [orderId],
      );

      for (const item of items) {
        if (item.book_id) {
          await addBookToLibrary(connection, orders[0].user_id, item.book_id);
        }
      }
    } else {
      await connection.query(
        `UPDATE orders
         SET payment_status = 'failed',
             order_status = 'cancelled'
         WHERE id = ?`,
        [orderId],
      );
    }

    await connection.commit();

    return res.json({
      message: "รับ webhook mock สำเร็จ",
      order_id: orderId,
      status,
    });
  } catch (error) {
    await connection.rollback();
    console.error("POST /payments/mock/webhook error:", error);
    return res.status(500).json({ message: "ประมวลผล webhook mock ไม่สำเร็จ" });
  } finally {
    connection.release();
  }
});

router.get("/status/:orderId", verifyToken, async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "order_id ไม่ถูกต้อง" });
    }

    const [rows] = await db.query(
      `SELECT id, total_amount, payment_method, payment_status, order_status, created_at
       FROM orders
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [orderId, req.user.id],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "ไม่พบข้อมูลการชำระเงิน" });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("GET /payments/status/:orderId error:", error);
    return res.status(500).json({ message: "โหลดสถานะการชำระเงินไม่สำเร็จ" });
  }
});

module.exports = router;
