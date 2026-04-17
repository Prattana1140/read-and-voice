const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
require("dotenv").config();

const { authMiddleware } = require("../middleware/authMiddleware");

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// 📌 เพิ่มลงตะกร้า
router.post("/", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { book_id } = req.body;

  try {
    await db.query(
      "INSERT INTO cart (user_id, book_id) VALUES (?, ?)",
      [userId, book_id]
    );

    res.json({ message: "เพิ่มลงตะกร้าแล้ว" });
  } catch (err) {
    res.status(500).json({ message: "error", err });
  }
});

// 📌 ดึง cart
router.get("/", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  const [rows] = await db.query(
    `SELECT cart.id, books.title, books.price 
     FROM cart 
     JOIN books ON cart.book_id = books.id
     WHERE cart.user_id = ?`,
    [userId]
  );

  res.json(rows);
});

// 📌 ลบ
router.delete("/:id", authMiddleware, async (req, res) => {
  await db.query("DELETE FROM cart WHERE id = ?", [req.params.id]);
  res.json({ message: "ลบแล้ว" });
});

module.exports = router;