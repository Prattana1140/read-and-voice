const db = require("../../config/db");

async function tryQuery(sql, label) {
  try {
    await db.query(sql);
    console.log(`OK: ${label}`);
  } catch (error) {
    const safeCodes = new Set([
      "ER_DUP_FIELDNAME",
      "ER_DUP_KEYNAME",
      "ER_FK_DUP_NAME",
      "ER_DUP_ENTRY",
      "ER_CANT_CREATE_TABLE",
      "ER_TABLE_EXISTS_ERROR",
    ]);

    if (safeCodes.has(error.code)) {
      console.log(`SKIP: ${label} (${error.code})`);
      return;
    }

    console.error(`FAILED: ${label}`, error.message);
    throw error;
  }
}

async function main() {
  await tryQuery(
    "ALTER TABLE books ADD COLUMN content_type VARCHAR(20) NOT NULL DEFAULT 'ebook' AFTER source_type",
    "books.content_type"
  );
  await tryQuery(
    "ALTER TABLE books ADD COLUMN access_type VARCHAR(20) NOT NULL DEFAULT 'paid' AFTER content_type",
    "books.access_type"
  );
  await tryQuery(
    "ALTER TABLE books ADD COLUMN preview_page_limit INT NOT NULL DEFAULT 1 AFTER price",
    "books.preview_page_limit"
  );
  await tryQuery(
    "ALTER TABLE books ADD COLUMN preview_char_limit INT NOT NULL DEFAULT 1500 AFTER preview_page_limit",
    "books.preview_char_limit"
  );

  await tryQuery(
    `CREATE TABLE IF NOT EXISTS book_episodes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      book_id INT NOT NULL,
      episode_number INT NOT NULL,
      title VARCHAR(500) NOT NULL,
      content LONGTEXT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      is_free TINYINT(1) NOT NULL DEFAULT 0,
      access_type VARCHAR(20) NOT NULL DEFAULT 'free',
      is_published TINYINT(1) NOT NULL DEFAULT 1,
      preview_char_limit INT NOT NULL DEFAULT 1500,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_book_episodes_book_episode (book_id, episode_number),
      INDEX idx_book_episodes_book_id (book_id),
      CONSTRAINT fk_book_episodes_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    "book_episodes"
  );

  await tryQuery(
    "ALTER TABLE book_episodes ADD COLUMN access_type VARCHAR(20) NOT NULL DEFAULT 'free' AFTER is_free",
    "book_episodes.access_type"
  );
  await tryQuery(
    "ALTER TABLE cart MODIFY book_id INT NULL",
    "cart.book_id nullable"
  );
  await tryQuery(
    "ALTER TABLE cart ADD COLUMN episode_id INT NULL AFTER book_id",
    "cart.episode_id"
  );
  await tryQuery(
    "ALTER TABLE cart ADD COLUMN quantity INT NOT NULL DEFAULT 1 AFTER episode_id",
    "cart.quantity"
  );
  await tryQuery(
    "ALTER TABLE cart ADD UNIQUE KEY uq_cart_user_episode (user_id, episode_id)",
    "cart.uq_cart_user_episode"
  );
  await tryQuery(
    "ALTER TABLE cart ADD CONSTRAINT fk_cart_episode FOREIGN KEY (episode_id) REFERENCES book_episodes(id) ON DELETE CASCADE",
    "cart.fk_cart_episode"
  );

  await tryQuery(
    "ALTER TABLE order_items MODIFY book_id INT NULL",
    "order_items.book_id nullable"
  );
  await tryQuery(
    "ALTER TABLE order_items ADD COLUMN episode_id INT NULL AFTER book_id",
    "order_items.episode_id"
  );
  await tryQuery(
    "ALTER TABLE order_items ADD COLUMN quantity INT NOT NULL DEFAULT 1 AFTER episode_id",
    "order_items.quantity"
  );
  await tryQuery(
    "ALTER TABLE order_items ADD CONSTRAINT fk_order_items_episode FOREIGN KEY (episode_id) REFERENCES book_episodes(id) ON DELETE CASCADE",
    "order_items.fk_order_items_episode"
  );

  await tryQuery(
    `CREATE TABLE IF NOT EXISTS subscription_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      duration_days INT NOT NULL DEFAULT 30,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    "subscription_plans"
  );
  await tryQuery(
    `CREATE TABLE IF NOT EXISTS user_subscriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      plan_id INT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      payment_status VARCHAR(50) NOT NULL DEFAULT 'paid',
      start_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      end_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_subscriptions_user_id (user_id),
      CONSTRAINT fk_user_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_user_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    "user_subscriptions"
  );
  await tryQuery(
    `CREATE TABLE IF NOT EXISTS coin_wallets (
      user_id INT PRIMARY KEY,
      balance INT NOT NULL DEFAULT 0,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_coin_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    "coin_wallets"
  );
  await tryQuery(
    `CREATE TABLE IF NOT EXISTS coin_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type ENUM('topup','purchase','refund','adjustment') NOT NULL,
      amount INT NOT NULL,
      balance_after INT NOT NULL,
      ref_type VARCHAR(50) NULL,
      ref_id INT NULL,
      description VARCHAR(500) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_coin_transactions_user_id (user_id),
      CONSTRAINT fk_coin_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    "coin_transactions"
  );

  await db.query(
    `INSERT INTO subscription_plans (name, description, price, duration_days)
     SELECT 'Monthly Plus', 'อ่านคอนเทนต์ subscription ได้ 30 วัน', 199.00, 30
     WHERE NOT EXISTS (SELECT 1 FROM subscription_plans LIMIT 1)`
  );

  console.log("Commerce migration completed.");
  await db.end();
}

main().catch(async (error) => {
  console.error("Commerce migration failed:", error);
  try {
    await db.end();
  } catch (_) {}
  process.exit(1);
});
