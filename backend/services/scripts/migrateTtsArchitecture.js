const db = require("../../config/db");
const { slugify } = require("../contentSegmenter");

async function getDatabaseName() {
  const [rows] = await db.query("SELECT DATABASE() AS database_name");
  return rows[0]?.database_name;
}

async function tableExists(databaseName, tableName) {
  const [rows] = await db.query(
    `SELECT 1
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     LIMIT 1`,
    [databaseName, tableName],
  );

  return rows.length > 0;
}

async function columnExists(databaseName, tableName, columnName) {
  const [rows] = await db.query(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [databaseName, tableName, columnName],
  );

  return rows.length > 0;
}

async function addColumn(databaseName, tableName, columnName, definition) {
  if (await columnExists(databaseName, tableName, columnName)) return;
  await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`);
  console.log(`Added ${tableName}.${columnName}`);
}

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS book_tags (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL UNIQUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS book_tag_maps (
      book_id BIGINT UNSIGNED NOT NULL,
      tag_id BIGINT UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (book_id, tag_id),
      INDEX idx_book_tag_maps_tag_id (tag_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS book_units (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      book_id BIGINT UNSIGNED NOT NULL,
      unit_type ENUM('chapter','episode') NOT NULL,
      unit_number INT NOT NULL,
      slug VARCHAR(255) NOT NULL,
      title VARCHAR(500) NOT NULL,
      short_title VARCHAR(255) NULL,
      summary TEXT NULL,
      access_type ENUM('inherit','free','paid','subscription') NOT NULL DEFAULT 'inherit',
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      coin_price INT NOT NULL DEFAULT 0,
      is_preview TINYINT(1) NOT NULL DEFAULT 0,
      lifecycle_status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
      audio_status ENUM('none','queued','processing','ready','failed') NOT NULL DEFAULT 'none',
      estimated_reading_minutes INT NOT NULL DEFAULT 0,
      sentence_count INT NOT NULL DEFAULT 0,
      word_count INT NOT NULL DEFAULT 0,
      published_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_book_units_book_unit_number (book_id, unit_number),
      UNIQUE KEY uq_book_units_book_slug (book_id, slug),
      INDEX idx_book_units_book_id (book_id),
      INDEX idx_book_units_type_status (unit_type, lifecycle_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS book_unit_blocks (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      book_unit_id BIGINT UNSIGNED NOT NULL,
      block_order INT NOT NULL,
      block_type ENUM('heading','paragraph','dialogue','quote','list_item','separator') NOT NULL DEFAULT 'paragraph',
      display_text LONGTEXT NOT NULL,
      tts_text LONGTEXT NULL,
      speaker_name VARCHAR(255) NULL,
      char_count INT NOT NULL DEFAULT 0,
      sentence_count INT NOT NULL DEFAULT 0,
      metadata_json JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_book_unit_blocks_order (book_unit_id, block_order),
      INDEX idx_book_unit_blocks_unit_id (book_unit_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS book_unit_sentences (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      sentence_uuid CHAR(36) NOT NULL,
      book_id BIGINT UNSIGNED NOT NULL,
      book_unit_id BIGINT UNSIGNED NOT NULL,
      block_id BIGINT UNSIGNED NOT NULL,
      sentence_order INT NOT NULL,
      sentence_in_block INT NOT NULL,
      display_text TEXT NOT NULL,
      tts_text TEXT NOT NULL,
      plain_text TEXT NOT NULL,
      start_offset INT NULL,
      end_offset INT NULL,
      duration_ms_estimate INT NOT NULL DEFAULT 0,
      audio_status ENUM('none','queued','processing','ready','failed') NOT NULL DEFAULT 'none',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_book_unit_sentences_uuid (sentence_uuid),
      UNIQUE KEY uq_book_unit_sentences_order (book_unit_id, sentence_order),
      INDEX idx_book_unit_sentences_block_id (block_id),
      INDEX idx_book_unit_sentences_book_id (book_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS tts_user_settings (
      user_id BIGINT UNSIGNED PRIMARY KEY,
      voice_name VARCHAR(255) NULL,
      locale VARCHAR(20) NOT NULL DEFAULT 'th-TH',
      rate DECIMAL(4,2) NOT NULL DEFAULT 1.00,
      pitch DECIMAL(4,2) NOT NULL DEFAULT 1.00,
      volume DECIMAL(4,2) NOT NULL DEFAULT 1.00,
      autoplay TINYINT(1) NOT NULL DEFAULT 0,
      highlight_enabled TINYINT(1) NOT NULL DEFAULT 1,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function backfillBooks() {
  const [rows] = await db.query(
    `SELECT id, title, author, author_name, cover_image, cover_image_url, is_published, slug, access_type, price
     FROM books`,
  );

  for (const row of rows) {
    const nextSlug = row.slug || `${slugify(row.title, "book")}-${row.id}`;
    const authorName = row.author_name || row.author || null;
    const coverImageUrl = row.cover_image_url || row.cover_image || null;
    const lifecycleStatus = Number(row.is_published) === 1 ? "published" : "draft";
    const approvalStatus = Number(row.is_published) === 1 ? "approved" : "pending";
    const isFreeBook =
      row.access_type === "free" || Number(row.price || 0) <= 0 ? 1 : 0;

    await db.query(
      `UPDATE books
       SET slug = ?,
           author_name = COALESCE(author_name, ?),
           cover_image_url = COALESCE(cover_image_url, ?),
           lifecycle_status = COALESCE(lifecycle_status, ?),
           publishing_status = COALESCE(publishing_status, 'ready'),
           approval_status = COALESCE(approval_status, ?),
           is_free_book = COALESCE(is_free_book, ?)
       WHERE id = ?`,
      [nextSlug, authorName, coverImageUrl, lifecycleStatus, approvalStatus, isFreeBook, row.id],
    );
  }
}

let migrationPromise;

async function migrateTtsArchitecture() {
  const databaseName = await getDatabaseName();
  if (!databaseName) throw new Error("Unable to determine active database.");

  if (!(await tableExists(databaseName, "books"))) {
    throw new Error("books table must exist before running this migration.");
  }

  await addColumn(
    databaseName,
    "books",
    "slug",
    "slug VARCHAR(255) NULL AFTER id",
  );
  await addColumn(
    databaseName,
    "books",
    "subtitle",
    "subtitle VARCHAR(500) NULL AFTER title",
  );
  await addColumn(
    databaseName,
    "books",
    "author_name",
    "author_name VARCHAR(255) NULL AFTER subtitle",
  );
  await addColumn(
    databaseName,
    "books",
    "author_id",
    "author_id BIGINT UNSIGNED NULL AFTER author_name",
  );
  await addColumn(
    databaseName,
    "books",
    "cover_image_url",
    "cover_image_url TEXT NULL AFTER description",
  );
  await addColumn(
    databaseName,
    "books",
    "language_code",
    "language_code VARCHAR(20) NOT NULL DEFAULT 'th' AFTER category_id",
  );
  await addColumn(
    databaseName,
    "books",
    "serial_status",
    "serial_status VARCHAR(30) NOT NULL DEFAULT 'completed' AFTER content_type",
  );
  await addColumn(
    databaseName,
    "books",
    "latest_episode_at",
    "latest_episode_at DATETIME NULL AFTER serial_status",
  );
  await addColumn(
    databaseName,
    "books",
    "lifecycle_status",
    "lifecycle_status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft' AFTER access_type",
  );
  await addColumn(
    databaseName,
    "books",
    "publishing_status",
    "publishing_status ENUM('processing','ready','failed') NOT NULL DEFAULT 'ready' AFTER lifecycle_status",
  );
  await addColumn(
    databaseName,
    "books",
    "coin_price",
    "coin_price INT NOT NULL DEFAULT 0 AFTER price",
  );
  await addColumn(
    databaseName,
    "books",
    "preview_mode",
    "preview_mode ENUM('none','percentage','chapter_count','sentence_count') NOT NULL DEFAULT 'percentage' AFTER coin_price",
  );
  await addColumn(
    databaseName,
    "books",
    "preview_value",
    "preview_value INT NOT NULL DEFAULT 10 AFTER preview_mode",
  );
  await addColumn(
    databaseName,
    "books",
    "total_units",
    "total_units INT NOT NULL DEFAULT 0 AFTER preview_value",
  );
  await addColumn(
    databaseName,
    "books",
    "total_blocks",
    "total_blocks INT NOT NULL DEFAULT 0 AFTER total_units",
  );
  await addColumn(
    databaseName,
    "books",
    "total_sentences",
    "total_sentences INT NOT NULL DEFAULT 0 AFTER total_blocks",
  );
  await addColumn(
    databaseName,
    "books",
    "total_words",
    "total_words INT NOT NULL DEFAULT 0 AFTER total_sentences",
  );
  await addColumn(
    databaseName,
    "books",
    "total_characters",
    "total_characters INT NOT NULL DEFAULT 0 AFTER total_words",
  );
  await addColumn(
    databaseName,
    "books",
    "estimated_reading_minutes",
    "estimated_reading_minutes INT NOT NULL DEFAULT 0 AFTER total_characters",
  );
  await addColumn(
    databaseName,
    "books",
    "age_rating",
    "age_rating VARCHAR(30) NULL AFTER estimated_reading_minutes",
  );
  await addColumn(
    databaseName,
    "books",
    "approval_status",
    "approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' AFTER age_rating",
  );
  await addColumn(
    databaseName,
    "books",
    "approval_note",
    "approval_note TEXT NULL AFTER approval_status",
  );
  await addColumn(
    databaseName,
    "books",
    "approved_by",
    "approved_by BIGINT UNSIGNED NULL AFTER approval_note",
  );
  await addColumn(
    databaseName,
    "books",
    "approved_at",
    "approved_at DATETIME NULL AFTER approved_by",
  );
  await addColumn(
    databaseName,
    "books",
    "requested_best_seller",
    "requested_best_seller TINYINT(1) NOT NULL DEFAULT 0 AFTER approved_at",
  );
  await addColumn(
    databaseName,
    "books",
    "requested_new_release",
    "requested_new_release TINYINT(1) NOT NULL DEFAULT 0 AFTER requested_best_seller",
  );
  await addColumn(
    databaseName,
    "books",
    "requested_promotion",
    "requested_promotion TINYINT(1) NOT NULL DEFAULT 0 AFTER requested_new_release",
  );
  await addColumn(
    databaseName,
    "books",
    "requested_free_book",
    "requested_free_book TINYINT(1) NOT NULL DEFAULT 0 AFTER requested_promotion",
  );
  await addColumn(
    databaseName,
    "books",
    "requested_hall_of_fame",
    "requested_hall_of_fame TINYINT(1) NOT NULL DEFAULT 0 AFTER requested_free_book",
  );
  await addColumn(
    databaseName,
    "books",
    "requested_recommended",
    "requested_recommended TINYINT(1) NOT NULL DEFAULT 0 AFTER requested_hall_of_fame",
  );
  await addColumn(
    databaseName,
    "books",
    "is_best_seller",
    "is_best_seller TINYINT(1) NOT NULL DEFAULT 0 AFTER requested_recommended",
  );
  await addColumn(
    databaseName,
    "books",
    "is_new_release",
    "is_new_release TINYINT(1) NOT NULL DEFAULT 0 AFTER is_best_seller",
  );
  await addColumn(
    databaseName,
    "books",
    "is_promotion",
    "is_promotion TINYINT(1) NOT NULL DEFAULT 0 AFTER is_new_release",
  );
  await addColumn(
    databaseName,
    "books",
    "is_free_book",
    "is_free_book TINYINT(1) NOT NULL DEFAULT 0 AFTER is_promotion",
  );
  await addColumn(
    databaseName,
    "books",
    "is_hall_of_fame",
    "is_hall_of_fame TINYINT(1) NOT NULL DEFAULT 0 AFTER is_free_book",
  );
  await addColumn(
    databaseName,
    "books",
    "is_recommended",
    "is_recommended TINYINT(1) NOT NULL DEFAULT 0 AFTER is_hall_of_fame",
  );

  await addColumn(
    databaseName,
    "reading_progress",
    "book_unit_id",
    "book_unit_id BIGINT UNSIGNED NULL AFTER book_id",
  );
  await addColumn(
    databaseName,
    "reading_progress",
    "block_id",
    "block_id BIGINT UNSIGNED NULL AFTER book_unit_id",
  );
  await addColumn(
    databaseName,
    "reading_progress",
    "sentence_id",
    "sentence_id BIGINT UNSIGNED NULL AFTER block_id",
  );
  await addColumn(
    databaseName,
    "reading_progress",
    "sentence_uuid",
    "sentence_uuid CHAR(36) NULL AFTER sentence_id",
  );
  await addColumn(
    databaseName,
    "reading_progress",
    "last_position_ms",
    "last_position_ms INT NOT NULL DEFAULT 0 AFTER sentence_uuid",
  );
  await addColumn(
    databaseName,
    "reading_progress",
    "last_scroll_offset",
    "last_scroll_offset INT NOT NULL DEFAULT 0 AFTER last_position_ms",
  );
  await addColumn(
    databaseName,
    "reading_progress",
    "reading_mode",
    "reading_mode ENUM('read','listen','read_listen') NOT NULL DEFAULT 'read' AFTER last_scroll_offset",
  );

  await ensureTables();
  await backfillBooks();

  console.log("TTS architecture migration complete.");
}

function ensureTtsArchitectureMigrated() {
  if (!migrationPromise) {
    migrationPromise = migrateTtsArchitecture().catch((error) => {
      migrationPromise = undefined;
      throw error;
    });
  }

  return migrationPromise;
}

async function main() {
  await ensureTtsArchitectureMigrated();
  await db.end();
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error("TTS architecture migration failed:", error);
    try {
      await db.end();
    } catch (_) {}
    process.exit(1);
  });
}

module.exports = {
  ensureTtsArchitectureMigrated,
};
