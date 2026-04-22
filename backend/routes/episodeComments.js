const express = require("express");
const db = require("../config/db");
const { optionalVerifyToken, verifyToken } = require("../middleware/auth");

const router = express.Router();

let tableReady;

async function ensureEpisodeCommentsTable() {
  if (!tableReady) {
    tableReady = db
      .query(`
        CREATE TABLE IF NOT EXISTS episode_comments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          episode_id INT NOT NULL,
          comment TEXT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_episode_comments_user_id (user_id),
          INDEX idx_episode_comments_episode_id (episode_id),
          CONSTRAINT fk_episode_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_episode_comments_episode FOREIGN KEY (episode_id) REFERENCES book_episodes(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      .then(() => true);
  }

  return tableReady;
}

async function findEpisode(episodeId) {
  const [rows] = await db.query(
    `SELECT id, book_id, title, is_published
     FROM book_episodes
     WHERE id = ?
     LIMIT 1`,
    [episodeId],
  );

  return rows[0] || null;
}

async function findComment(commentId) {
  const [rows] = await db.query(
    `SELECT id, user_id, episode_id, comment
     FROM episode_comments
     WHERE id = ?
     LIMIT 1`,
    [commentId],
  );

  return rows[0] || null;
}

function canManageComment(user, comment) {
  if (!user || !comment) return false;
  if (["admin", "superadmin"].includes(user.role)) return true;
  return Number(user.id) === Number(comment.user_id);
}

router.get("/episodes/:episodeId/comments", optionalVerifyToken, async (req, res) => {
  try {
    await ensureEpisodeCommentsTable();
    const episodeId = Number(req.params.episodeId);

    if (!Number.isInteger(episodeId) || episodeId <= 0) {
      return res.status(400).json({ message: "episodeId ไม่ถูกต้อง" });
    }

    const episode = await findEpisode(episodeId);
    if (!episode || Number(episode.is_published) !== 1) {
      return res.status(404).json({ message: "ไม่พบตอนที่ต้องการ" });
    }

    const [items] = await db.query(
      `SELECT
         c.id,
         c.user_id,
         c.episode_id,
         c.comment,
         c.created_at,
         c.updated_at,
         COALESCE(u.name, 'Reader') AS user_name
       FROM episode_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.episode_id = ?
       ORDER BY c.created_at DESC, c.id DESC`,
      [episodeId],
    );

    const [summaryRows] = await db.query(
      `SELECT COUNT(*) AS comment_count
       FROM episode_comments
       WHERE episode_id = ?`,
      [episodeId],
    );

    return res.json({
      items: items.map((item) => ({
        ...item,
        can_manage: canManageComment(req.user, item),
      })),
      summary: {
        comment_count: Number(summaryRows[0]?.comment_count || 0),
      },
      episode: {
        id: episode.id,
        title: episode.title,
      },
    });
  } catch (error) {
    console.error("GET /episodes/:episodeId/comments error:", error);
    return res.status(500).json({ message: "โหลดคอมเมนต์รายตอนไม่สำเร็จ" });
  }
});

router.post("/episodes/:episodeId/comments", verifyToken, async (req, res) => {
  try {
    await ensureEpisodeCommentsTable();
    const episodeId = Number(req.params.episodeId);
    const comment = String(req.body.comment || "").trim();

    if (!Number.isInteger(episodeId) || episodeId <= 0) {
      return res.status(400).json({ message: "episodeId ไม่ถูกต้อง" });
    }

    if (!comment) {
      return res.status(400).json({ message: "กรุณาเขียนความคิดเห็นก่อนส่ง" });
    }

    const episode = await findEpisode(episodeId);
    if (!episode || Number(episode.is_published) !== 1) {
      return res.status(404).json({ message: "ไม่พบตอนที่ต้องการ" });
    }

    const [result] = await db.query(
      `INSERT INTO episode_comments (user_id, episode_id, comment)
       VALUES (?, ?, ?)`,
      [req.user.id, episodeId, comment],
    );

    return res.status(201).json({
      message: "ส่งความคิดเห็นสำเร็จ",
      comment_id: result.insertId,
    });
  } catch (error) {
    console.error("POST /episodes/:episodeId/comments error:", error);
    return res.status(500).json({ message: "ส่งความคิดเห็นไม่สำเร็จ" });
  }
});

router.put("/episode-comments/:commentId", verifyToken, async (req, res) => {
  try {
    await ensureEpisodeCommentsTable();
    const commentId = Number(req.params.commentId);
    const comment = String(req.body.comment || "").trim();

    if (!Number.isInteger(commentId) || commentId <= 0) {
      return res.status(400).json({ message: "commentId ไม่ถูกต้อง" });
    }

    if (!comment) {
      return res.status(400).json({ message: "กรุณาเขียนความคิดเห็นก่อนบันทึก" });
    }

    const existing = await findComment(commentId);
    if (!existing) {
      return res.status(404).json({ message: "ไม่พบคอมเมนต์นี้" });
    }

    if (!canManageComment(req.user, existing)) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์แก้ไขคอมเมนต์นี้" });
    }

    await db.query(
      `UPDATE episode_comments
       SET comment = ?, updated_at = NOW()
       WHERE id = ?`,
      [comment, commentId],
    );

    return res.json({ message: "อัปเดตความคิดเห็นสำเร็จ" });
  } catch (error) {
    console.error("PUT /episode-comments/:commentId error:", error);
    return res.status(500).json({ message: "อัปเดตความคิดเห็นไม่สำเร็จ" });
  }
});

router.delete("/episode-comments/:commentId", verifyToken, async (req, res) => {
  try {
    await ensureEpisodeCommentsTable();
    const commentId = Number(req.params.commentId);

    if (!Number.isInteger(commentId) || commentId <= 0) {
      return res.status(400).json({ message: "commentId ไม่ถูกต้อง" });
    }

    const existing = await findComment(commentId);
    if (!existing) {
      return res.status(404).json({ message: "ไม่พบคอมเมนต์นี้" });
    }

    if (!canManageComment(req.user, existing)) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์ลบคอมเมนต์นี้" });
    }

    await db.query("DELETE FROM episode_comments WHERE id = ?", [commentId]);

    return res.json({ message: "ลบความคิดเห็นสำเร็จ" });
  } catch (error) {
    console.error("DELETE /episode-comments/:commentId error:", error);
    return res.status(500).json({ message: "ลบความคิดเห็นไม่สำเร็จ" });
  }
});

module.exports = router;
