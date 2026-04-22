const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

async function addBookToLibrary(connection, userId, bookId) {
  if (!bookId) return;

  await connection.query(
    "INSERT IGNORE INTO `library` (user_id, book_id) VALUES (?, ?)",
    [userId, bookId],
  );
}

router.post("/mock/create", verifyToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.id;
    const { book_id, episode_id } = req.body;

    if (!book_id && !episode_id) {
      return res.status(400).json({ message: "ต้องระบุหนังสือหรือรายตอนที่ต้องการชำระ" });
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

router.post("/mock/webhook", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const orderId = Number(req.body.order_id);
    const status = String(req.body.status || "paid").toLowerCase();

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "order_id ไม่ถูกต้อง" });
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
