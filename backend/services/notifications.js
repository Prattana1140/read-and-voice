const db = require("../config/db");

let tablesReady;

const fetch = global.fetch;

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

async function deliverNotificationWebhook(notification) {
  const webhookUrl = readEnv("NOTIFICATION_DELIVERY_WEBHOOK_URL");
  if (!webhookUrl || !fetch) return;

  const headers = {
    "Content-Type": "application/json",
  };
  const secret = readEnv("NOTIFICATION_DELIVERY_WEBHOOK_SECRET");
  if (secret) {
    headers["x-notification-webhook-secret"] = secret;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      template: "user_notification",
      ...notification,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Notification delivery webhook failed (${response.status}): ${body.slice(0, 200)}`);
  }
}

async function ensureNotificationTables() {
  if (!tablesReady) {
    tablesReady = Promise.all([
      db.query(`
        CREATE TABLE IF NOT EXISTS account_follows (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          target_type VARCHAR(40) NOT NULL DEFAULT 'book',
          target_id INT NULL,
          target_name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_account_follows_user (user_id),
          CONSTRAINT fk_account_follows_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS user_notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          type VARCHAR(60) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          action_url VARCHAR(255) NULL,
          is_read TINYINT(1) NOT NULL DEFAULT 0,
          metadata_json JSON NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          read_at DATETIME NULL,
          INDEX idx_user_notifications_user (user_id),
          CONSTRAINT fk_user_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `),
      db.query(`
        CREATE TABLE IF NOT EXISTS user_notification_settings (
          user_id INT PRIMARY KEY,
          writers TINYINT(1) NOT NULL DEFAULT 1,
          series TINYINT(1) NOT NULL DEFAULT 1,
          promotions TINYINT(1) NOT NULL DEFAULT 0,
          system TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_user_notification_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `),
    ]).then(() => true);
  }

  return tablesReady;
}

async function createNotification({
  userId,
  type,
  title,
  message,
  actionUrl = null,
  metadata = null,
  connection = db,
}) {
  await ensureNotificationTables();

  const [settingsRows] = await connection.query(
    `SELECT writers, series, promotions, system
     FROM user_notification_settings
     WHERE user_id = ?
     LIMIT 1`,
    [userId],
  );
  const settings = settingsRows[0] || {};
  const notificationType = String(type || "");

  if (notificationType.startsWith("writer_") && settings.writers === 0) return;
  if (notificationType.startsWith("series_") && settings.series === 0) return;
  if (notificationType.startsWith("promotion") && settings.promotions === 0) return;
  if (notificationType.startsWith("system_") && settings.system === 0) return;

  const [result] = await connection.query(
    `INSERT INTO user_notifications
     (user_id, type, title, message, action_url, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      type,
      title,
      message,
      actionUrl,
      metadata ? JSON.stringify(metadata) : null,
    ],
  );

  deliverNotificationWebhook({
    id: result.insertId,
    user_id: userId,
    type,
    title,
    message,
    action_url: actionUrl,
    metadata,
  }).catch((error) => {
    console.error("Notification delivery webhook error:", error.message);
  });
}

async function notifyWriterFollowersAboutEpisode({
  bookId,
  episodeId,
  episodeTitle,
  connection = db,
}) {
  await ensureNotificationTables();

  const [bookRows] = await connection.query(
    `SELECT id, title, created_by, author, author_name
     FROM books
     WHERE id = ?
     LIMIT 1`,
    [bookId],
  );

  const book = bookRows[0];
  if (!book || !book.created_by) return;

  const [followers] = await connection.query(
    `SELECT DISTINCT user_id
     FROM account_follows
     WHERE target_type = 'writer'
       AND target_id = ?`,
    [book.created_by],
  );

  if (!followers.length) return;

  const writerName = book.author_name || book.author || "นักเขียนที่คุณติดตาม";
  const notificationTitle = `${writerName} อัปเดตตอนใหม่`;
  const notificationMessage = `${book.title} ตอน "${episodeTitle}" พร้อมให้อ่านแล้ว`;
  const actionUrl = `/reader/${bookId}?episode=${episodeId}`;

  for (const follower of followers) {
    await createNotification({
      userId: follower.user_id,
      type: "writer_new_episode",
      title: notificationTitle,
      message: notificationMessage,
      actionUrl,
      metadata: {
        book_id: bookId,
        episode_id: episodeId,
      },
      connection,
    });
  }
}

module.exports = {
  ensureNotificationTables,
  createNotification,
  notifyWriterFollowersAboutEpisode,
};
