const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

// checkout
router.post("/checkout", verifyToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    const userId = req.user.id;
    const { payment_method = "mock" } = req.body;

    await connection.beginTransaction();

    const [cartItems] = await connection.query(
      `
      SELECT c.id AS cart_id, c.book_id, b.price
      FROM cart c
      JOIN books b ON c.book_id = b.id
      WHERE c.user_id = ?
      `,
      [userId]
    );

    if (cartItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: "ไม่มีสินค้าในตะกร้า" });
    }

    const totalAmount = cartItems.reduce(
      (sum, item) => sum + Number(item.price || 0),
      0
    );

    const [orderResult] = await connection.query(
      `
      INSERT INTO orders
      (user_id, total_amount, payment_method, payment_status, order_status)
      VALUES (?, ?, ?, 'paid', 'completed')
      `,
      [userId, totalAmount, payment_method]
    );

    const orderId = orderResult.insertId;

    for (const item of cartItems) {
      await connection.query(
        `
        INSERT INTO order_items (order_id, book_id, price)
        VALUES (?, ?, ?)
        `,
        [orderId, item.book_id, Number(item.price || 0)]
      );
    }

    await connection.query("DELETE FROM cart WHERE user_id = ?", [userId]);

    await connection.commit();

    res.json({
      message: "สั่งซื้อสำเร็จ",
      order_id: orderId,
      total_amount: totalAmount,
    });
  } catch (error) {
    await connection.rollback();
    console.error("POST /orders/checkout error:", error);
    res.status(500).json({ message: "สั่งซื้อไม่สำเร็จ" });
  } finally {
    connection.release();
  }
});

// order history
router.get("/history", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [orders] = await db.query(
      `
      SELECT
        o.id,
        o.user_id,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.order_status,
        o.created_at
      FROM orders o
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
      `,
      [userId]
    );

    for (const order of orders) {
      const [items] = await db.query(
        `
        SELECT
          oi.id,
          oi.order_id,
          oi.book_id,
          oi.price,
          b.title,
          b.author,
          b.cover_image
        FROM order_items oi
        JOIN books b ON oi.book_id = b.id
        WHERE oi.order_id = ?
        `,
        [order.id]
      );

      order.items = items;
    }

    res.json(orders);
  } catch (error) {
    console.error("GET /orders/history error:", error);
    res.status(500).json({ message: "โหลดประวัติคำสั่งซื้อไม่สำเร็จ" });
  }
});

module.exports = router;