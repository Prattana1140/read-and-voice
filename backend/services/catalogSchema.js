const db = require("../config/db");

let schemaReadyPromise;

async function hasColumn(tableName, columnName) {
  const [rows] = await db.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName],
  );

  return rows.length > 0;
}

async function ensureColumn(tableName, columnName, definition) {
  if (await hasColumn(tableName, columnName)) {
    return;
  }

  await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
}

async function ensureCatalogAnalyticsSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await ensureColumn(
        "books",
        "promo_discount_percent",
        "promo_discount_percent INT NOT NULL DEFAULT 0 AFTER price",
      );
      await ensureColumn(
        "books",
        "promo_start_at",
        "promo_start_at DATETIME NULL AFTER promo_discount_percent",
      );
      await ensureColumn(
        "books",
        "promo_end_at",
        "promo_end_at DATETIME NULL AFTER promo_start_at",
      );

      await db.query(`
        CREATE TABLE IF NOT EXISTS episode_views (
          id INT AUTO_INCREMENT PRIMARY KEY,
          episode_id INT NOT NULL,
          user_id INT NULL,
          viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_episode_views_episode_id (episode_id),
          INDEX idx_episode_views_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  return schemaReadyPromise;
}

module.exports = {
  ensureCatalogAnalyticsSchema,
};
