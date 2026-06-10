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

async function hasIndex(tableName, indexName) {
  const [rows] = await db.query(
    `SELECT 1
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [tableName, indexName],
  );

  return rows.length > 0;
}

async function ensureIndex(tableName, indexName, definition) {
  if (await hasIndex(tableName, indexName)) {
    return;
  }

  await db.query(`ALTER TABLE ${tableName} ADD INDEX ${indexName} ${definition}`);
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
      await ensureColumn(
        "books",
        "serial_status",
        "serial_status VARCHAR(30) NOT NULL DEFAULT 'completed' AFTER content_type",
      );
      await ensureColumn(
        "books",
        "latest_episode_at",
        "latest_episode_at DATETIME NULL AFTER serial_status",
      );
      await ensureColumn(
        "books",
        "is_promotion",
        "is_promotion TINYINT(1) NOT NULL DEFAULT 0",
      );
      await ensureColumn(
        "books",
        "is_best_seller",
        "is_best_seller TINYINT(1) NOT NULL DEFAULT 0",
      );
      await db.query("ALTER TABLE books MODIFY COLUMN serial_status VARCHAR(30) NOT NULL DEFAULT 'completed'");
      await db.query(`
        UPDATE books
        SET serial_status = 'completed',
            latest_episode_at = NULL
        WHERE COALESCE(content_type, 'ebook') <> 'serial'
      `);
      await ensureIndex("books", "idx_books_serial_status", "(serial_status)");
      await ensureIndex("books", "idx_books_latest_episode_at", "(latest_episode_at)");
      await ensureIndex(
        "books",
        "idx_books_promo_active",
        "(is_promotion, promo_discount_percent, promo_start_at, promo_end_at)",
      );
      await ensureIndex("books", "idx_books_best_seller", "(is_best_seller)");

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
