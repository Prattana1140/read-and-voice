const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

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

async function hasPurchasedBook(connection, userId, bookId) {
  const [rows] = await connection.query(
    `SELECT oi.id
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE o.user_id = ?
       AND oi.book_id = ?
       AND o.payment_status = 'paid'
       AND o.order_status = 'completed'
     LIMIT 1`,
    [userId, bookId]
  );

  return rows.length > 0;
}

async function hasPurchasedEpisode(connection, userId, episodeId) {
  const [rows] = await connection.query(
    `SELECT oi.id
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE o.user_id = ?
       AND oi.episode_id = ?
       AND o.payment_status = 'paid'
       AND o.order_status = 'completed'
     LIMIT 1`,
    [userId, episodeId]
  );

  return rows.length > 0;
}

async function addBookToLibrary(connection, userId, bookId) {
  if (!bookId) return;

  await connection.query(
    "INSERT IGNORE INTO `library` (user_id, book_id) VALUES (?, ?)",
    [userId, bookId]
  );
}

function normalizePaymentMethod(value) {
  const method = value === "mock" ? "coin" : String(value || "coin").trim().toLowerCase();

  if (method !== "coin") {
    const error = new Error("PAYMENT_METHOD_UNSUPPORTED");
    error.status = 400;
    throw error;
  }

  return method;
}

router.post("/checkout", verifyToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.id;
    const { payment_method = "coin" } = req.body;

    await connection.beginTransaction();

    const [cartItems] = await connection.query(
      `SELECT
         c.id AS cart_id,
         c.book_id,
         c.episode_id,
         c.quantity,
         COALESCE(e.price, b.price, 0) AS price
       FROM cart c
       LEFT JOIN books b ON c.book_id = b.id
       LEFT JOIN book_episodes e ON c.episode_id = e.id
       WHERE c.user_id = ?`,
      [userId]
    );

    if (cartItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: "ไม่มีสินค้าในตะกร้า" });
    }

    for (const item of cartItems) {
      if (item.book_id) {
        const alreadyBought = await hasPurchasedBook(
          connection,
          userId,
          item.book_id
        );

        if (alreadyBought) {
          await connection.rollback();
          return res.status(400).json({
            message: `คุณซื้อหนังสือเล่มนี้ไปแล้ว (book_id: ${item.book_id})`,
          });
        }
      }

      if (item.episode_id) {
        const alreadyBought = await hasPurchasedEpisode(
          connection,
          userId,
          item.episode_id
        );

        if (alreadyBought) {
          await connection.rollback();
          return res.status(400).json({
            message: `คุณซื้อตอนนี้ไปแล้ว (episode_id: ${item.episode_id})`,
          });
        }
      }
    }

    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + Number(item.price || 0) * Number(item.quantity || 1);
    }, 0);
    const normalizedPaymentMethod = normalizePaymentMethod(payment_method);

    const [orderResult] = await connection.query(
      `INSERT INTO orders
       (user_id, total_amount, payment_method, payment_status, order_status)
       VALUES (?, ?, ?, 'paid', 'completed')`,
      [userId, totalAmount, normalizedPaymentMethod]
    );

    const orderId = orderResult.insertId;

    if (normalizedPaymentMethod === "coin" && totalAmount > 0) {
      await debitCoins(
        connection,
        userId,
        Math.ceil(totalAmount),
        "order",
        orderId,
        `Order #${orderId}`
      );
    }

    for (const item of cartItems) {
      await connection.query(
        `INSERT INTO order_items (order_id, book_id, episode_id, quantity, price)
         VALUES (?, ?, ?, ?, ?)`,
        [
          orderId,
          item.book_id || null,
          item.episode_id || null,
          Number(item.quantity || 1),
          Number(item.price || 0),
        ]
      );

      if (item.book_id) {
        await addBookToLibrary(connection, userId, item.book_id);
      }
    }

    await connection.query("DELETE FROM cart WHERE user_id = ?", [userId]);
    await connection.commit();

    return res.json({
      message: "สั่งซื้อสำเร็จ",
      order_id: orderId,
      total_amount: totalAmount,
    });
  } catch (error) {
    await connection.rollback();

    if (error.message === "PAYMENT_METHOD_UNSUPPORTED") {
      return res.status(error.status || 400).json({
        message: "รองรับการซื้อด้วย coin เท่านั้น กรุณาเติม coin ผ่าน payment gateway ก่อน",
      });
    }

    if (error.message === "COINS_NOT_ENOUGH") {
      return res.status(402).json({
        message: "coin ไม่พอ กรุณาเติม coin ก่อน",
        balance: error.balance,
      });
    }

    console.error("POST /orders/checkout error:", error);
    return res.status(500).json({ message: "สั่งซื้อไม่สำเร็จ" });
  } finally {
    connection.release();
  }
});

router.post("/purchase", verifyToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.id;
    const { book_id, episode_id, payment_method = "coin" } = req.body;

    if (!book_id && !episode_id) {
      return res.status(400).json({ message: "ต้องเลือกหนังสือหรือตอน" });
    }

    if (book_id && episode_id) {
      return res.status(400).json({ message: "ซื้อได้ทีละรายการเท่านั้น" });
    }

    let item = null;

    if (episode_id) {
      const alreadyBought = await hasPurchasedEpisode(
        connection,
        userId,
        episode_id
      );
      if (alreadyBought) {
        return res.status(400).json({ message: "คุณซื้อตอนนี้ไปแล้ว" });
      }

      const [episodes] = await connection.query(
        `SELECT e.id AS episode_id, e.book_id, e.price, e.title, b.title AS book_title
         FROM book_episodes e
         JOIN books b ON e.book_id = b.id
         WHERE e.id = ?
         LIMIT 1`,
        [episode_id]
      );

      if (episodes.length === 0) {
        return res.status(404).json({ message: "ไม่พบตอนนี้" });
      }

      item = episodes[0];
    } else {
      const alreadyBought = await hasPurchasedBook(connection, userId, book_id);
      if (alreadyBought) {
        return res.status(400).json({ message: "คุณซื้อหนังสือเล่มนี้ไปแล้ว" });
      }

      const [books] = await connection.query(
        `SELECT id AS book_id, price, title
         FROM books
         WHERE id = ?
         LIMIT 1`,
        [book_id]
      );

      if (books.length === 0) {
        return res.status(404).json({ message: "ไม่พบหนังสือเล่มนี้" });
      }

      item = books[0];
    }

    await connection.beginTransaction();

    const totalAmount = Number(item.price || 0);
    const normalizedPaymentMethod = normalizePaymentMethod(payment_method);

    const [orderResult] = await connection.query(
      `INSERT INTO orders
       (user_id, total_amount, payment_method, payment_status, order_status)
       VALUES (?, ?, ?, 'paid', 'completed')`,
      [userId, totalAmount, normalizedPaymentMethod]
    );

    const orderId = orderResult.insertId;

    if (normalizedPaymentMethod === "coin" && totalAmount > 0) {
      await debitCoins(
        connection,
        userId,
        Math.ceil(totalAmount),
        "order",
        orderId,
        `Purchase #${orderId}`
      );
    }

    await connection.query(
      `INSERT INTO order_items (order_id, book_id, episode_id, quantity, price)
       VALUES (?, ?, ?, 1, ?)`,
      [
        orderId,
        episode_id ? null : item.book_id,
        episode_id ? item.episode_id : null,
        totalAmount,
      ]
    );

    if (!episode_id) {
      await addBookToLibrary(connection, userId, item.book_id);
    }

    await connection.commit();

    return res.json({
      message: "สั่งซื้อสำเร็จ",
      order_id: orderId,
      total_amount: totalAmount,
    });
  } catch (error) {
    await connection.rollback();

    if (error.message === "COINS_NOT_ENOUGH") {
      return res.status(402).json({
        message: "coin ไม่พอ กรุณาเติม coin ก่อน",
        balance: error.balance,
      });
    }

    if (error.message === "PAYMENT_METHOD_UNSUPPORTED") {
      return res.status(error.status || 400).json({
        message: "รองรับการซื้อด้วย coin เท่านั้น กรุณาเติม coin ผ่าน payment gateway ก่อน",
      });
    }

    console.error("POST /orders/purchase error:", error);
    return res.status(500).json({ message: "สั่งซื้อไม่สำเร็จ" });
  } finally {
    connection.release();
  }
});

router.get("/history", verifyToken, async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT
         o.id,
         o.user_id,
         o.total_amount,
         o.payment_method,
         o.payment_status,
         o.order_status,
         o.created_at
       FROM orders o
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    for (const order of orders) {
      const [items] = await db.query(
        `SELECT
           oi.id,
           oi.order_id,
           oi.book_id,
           oi.episode_id,
           oi.quantity,
           oi.price,
           COALESCE(e.title, b.title) AS title,
           COALESCE(b.title, eb.title) AS book_title,
           COALESCE(b.author, eb.author) AS author,
           COALESCE(b.cover_image, eb.cover_image) AS cover_image,
           e.episode_number
         FROM order_items oi
         LEFT JOIN books b ON oi.book_id = b.id
         LEFT JOIN book_episodes e ON oi.episode_id = e.id
         LEFT JOIN books eb ON e.book_id = eb.id
         WHERE oi.order_id = ?`,
        [order.id]
      );

      order.items = items;
    }

    return res.json(orders);
  } catch (error) {
    console.error("GET /orders/history error:", error);
    return res.status(500).json({ message: "โหลดประวัติคำสั่งซื้อไม่สำเร็จ" });
  }
});

module.exports = router;
