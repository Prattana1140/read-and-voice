const db = require("../../config/db");

async function getDatabaseName() {
  const [rows] = await db.query("SELECT DATABASE() AS database_name");
  return rows[0]?.database_name;
}

async function columnExists(databaseName, tableName, columnName) {
  const [rows] = await db.query(
    `
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [databaseName, tableName, columnName]
  );

  return rows.length > 0;
}

async function indexExists(databaseName, tableName, indexName) {
  const [rows] = await db.query(
    `
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?
    LIMIT 1
    `,
    [databaseName, tableName, indexName]
  );

  return rows.length > 0;
}

async function constraintExists(databaseName, tableName, constraintName) {
  const [rows] = await db.query(
    `
    SELECT 1
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
      AND CONSTRAINT_NAME = ?
    LIMIT 1
    `,
    [databaseName, tableName, constraintName]
  );

  return rows.length > 0;
}

async function addColumn(databaseName, tableName, columnName, definition) {
  if (await columnExists(databaseName, tableName, columnName)) {
    return;
  }

  await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`);
  console.log(`Added ${tableName}.${columnName}`);
}

async function addIndex(databaseName, tableName, indexName, definition) {
  if (await indexExists(databaseName, tableName, indexName)) {
    return;
  }

  await db.query(`ALTER TABLE \`${tableName}\` ADD ${definition}`);
  console.log(`Added index ${tableName}.${indexName}`);
}

async function addConstraint(databaseName, tableName, constraintName, definition) {
  if (await constraintExists(databaseName, tableName, constraintName)) {
    return;
  }

  await db.query(`ALTER TABLE \`${tableName}\` ADD CONSTRAINT ${definition}`);
  console.log(`Added constraint ${tableName}.${constraintName}`);
}

async function main() {
  const databaseName = await getDatabaseName();

  if (!databaseName) {
    throw new Error("Unable to determine active database.");
  }

  await addColumn(
    databaseName,
    "books",
    "content_type",
    "content_type VARCHAR(20) NOT NULL DEFAULT 'ebook' AFTER source_type"
  );
  await addColumn(
    databaseName,
    "books",
    "access_type",
    "access_type VARCHAR(20) NOT NULL DEFAULT 'paid' AFTER content_type"
  );
  await addColumn(
    databaseName,
    "books",
    "preview_page_limit",
    "preview_page_limit INT NOT NULL DEFAULT 1 AFTER price"
  );
  await addColumn(
    databaseName,
    "books",
    "preview_char_limit",
    "preview_char_limit INT NOT NULL DEFAULT 1500 AFTER preview_page_limit"
  );
  await addIndex(
    databaseName,
    "books",
    "idx_books_content_type",
    "INDEX idx_books_content_type (content_type)"
  );
  await addIndex(
    databaseName,
    "books",
    "idx_books_access_type",
    "INDEX idx_books_access_type (access_type)"
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS book_episodes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      book_id INT NOT NULL,
      episode_number INT NOT NULL,
      title VARCHAR(500) NOT NULL,
      content LONGTEXT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      is_free TINYINT(1) NOT NULL DEFAULT 0,
      is_published TINYINT(1) NOT NULL DEFAULT 1,
      preview_char_limit INT NOT NULL DEFAULT 1500,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_book_episodes_book_episode (book_id, episode_number),
      INDEX idx_book_episodes_book_id (book_id),
      CONSTRAINT fk_book_episodes_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("Ensured book_episodes table");

  await db.query("ALTER TABLE cart MODIFY book_id INT NULL");
  await addColumn(databaseName, "cart", "episode_id", "episode_id INT NULL AFTER book_id");
  await addIndex(
    databaseName,
    "cart",
    "uq_cart_user_episode",
    "UNIQUE KEY uq_cart_user_episode (user_id, episode_id)"
  );
  await addConstraint(
    databaseName,
    "cart",
    "fk_cart_episode",
    "fk_cart_episode FOREIGN KEY (episode_id) REFERENCES book_episodes(id) ON DELETE CASCADE"
  );

  await db.query("ALTER TABLE order_items MODIFY book_id INT NULL");
  await addColumn(
    databaseName,
    "order_items",
    "episode_id",
    "episode_id INT NULL AFTER book_id"
  );
  await addConstraint(
    databaseName,
    "order_items",
    "fk_order_items_episode",
    "fk_order_items_episode FOREIGN KEY (episode_id) REFERENCES book_episodes(id) ON DELETE CASCADE"
  );

  console.log("Content model migration complete.");
  await db.end();
}

main().catch(async (error) => {
  console.error("Content model migration failed:", error);
  try {
    await db.end();
  } catch (_) {}
  process.exit(1);
});
