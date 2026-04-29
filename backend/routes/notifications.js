const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { ensureNotificationTables } = require("../services/notifications");

const router = express.Router();

router.use(verifyToken);

router.get("/", async (req, res) => {
  try {
    await ensureNotificationTables();
    const [rows] = await db.query(
      `SELECT id, type, title, message, action_url, is_read, metadata_json, created_at, read_at
       FROM user_notifications
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [req.user.id],
    );

    return res.json({
      items: rows.map((row) => ({
        ...row,
        metadata:
          typeof row.metadata_json === "string" && row.metadata_json
            ? JSON.parse(row.metadata_json)
            : row.metadata_json,
      })),
    });
  } catch (error) {
    console.error("GET /account/notifications error:", error);
    return res.status(500).json({ message: "โหลดการแจ้งเตือนไม่สำเร็จ" });
  }
});

router.delete("/", async (req, res) => {
  try {
    await ensureNotificationTables();
    await db.query(
      `DELETE FROM user_notifications
       WHERE user_id = ?`,
      [req.user.id],
    );

    return res.json({ message: "ลบการแจ้งเตือนทั้งหมดแล้ว" });
  } catch (error) {
    console.error("DELETE /account/notifications error:", error);
    return res.status(500).json({ message: "ลบการแจ้งเตือนไม่สำเร็จ" });
  }
});

router.post("/:id/read", async (req, res) => {
  try {
    await ensureNotificationTables();
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "notification id ไม่ถูกต้อง" });
    }

    await db.query(
      `UPDATE user_notifications
       SET is_read = 1, read_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [id, req.user.id],
    );

    return res.json({ message: "อ่านการแจ้งเตือนแล้ว" });
  } catch (error) {
    console.error("POST /account/notifications/:id/read error:", error);
    return res.status(500).json({ message: "อัปเดตสถานะการแจ้งเตือนไม่สำเร็จ" });
  }
});

router.post("/read-all", async (req, res) => {
  try {
    await ensureNotificationTables();
    await db.query(
      `UPDATE user_notifications
       SET is_read = 1, read_at = NOW()
       WHERE user_id = ? AND is_read = 0`,
      [req.user.id],
    );

    return res.json({ message: "อ่านการแจ้งเตือนทั้งหมดแล้ว" });
  } catch (error) {
    console.error("POST /account/notifications/read-all error:", error);
    return res.status(500).json({ message: "อัปเดตการแจ้งเตือนทั้งหมดไม่สำเร็จ" });
  }
});

module.exports = router;
