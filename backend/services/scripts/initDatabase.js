const db = require("../../config/db");

const statements = [
  `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'writer', 'admin', 'superadmin') NOT NULL DEFAULT 'user',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(255) NOT NULL,
    description TEXT NULL,
    category_id INT NULL,
    cover_image TEXT NULL,
    source_type VARCHAR(50) NULL,
    content_type VARCHAR(20) NOT NULL DEFAULT 'ebook',
    access_type VARCHAR(20) NOT NULL DEFAULT 'paid',
    process_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    full_text LONGTEXT NULL,
    total_pages INT NOT NULL DEFAULT 0,
    is_published TINYINT(1) NOT NULL DEFAULT 1,
    created_by INT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    preview_page_limit INT NOT NULL DEFAULT 1,
    preview_char_limit INT NOT NULL DEFAULT 1500,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_books_content_type (content_type),
    INDEX idx_books_access_type (access_type),
    INDEX idx_books_category_id (category_id),
    INDEX idx_books_created_by (created_by),
    CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_books_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS book_episodes (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS book_pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    page_number INT NOT NULL,
    page_text LONGTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_book_pages_book_page (book_id, page_number),
    CONSTRAINT fk_book_pages_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS book_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    stored_filename VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_ext VARCHAR(50) NULL,
    mime_type VARCHAR(255) NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_book_files_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NULL,
    episode_id INT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cart_user_book (user_id, book_id),
    UNIQUE KEY uq_cart_user_episode (user_id, episode_id),
    CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_episode FOREIGN KEY (episode_id) REFERENCES book_episodes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(100) NOT NULL DEFAULT 'mock',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    order_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    book_id INT NULL,
    episode_id INT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_episode FOREIGN KEY (episode_id) REFERENCES book_episodes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS \`library\` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_library_user_book (user_id, book_id),
    CONSTRAINT fk_library_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_library_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS reading_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    current_page INT NOT NULL DEFAULT 1,
    last_position INT NOT NULL DEFAULT 0,
    progress_percent DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    last_read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_reading_progress_user_book (user_id, book_id),
    CONSTRAINT fk_reading_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reading_progress_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS tts_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    rate DECIMAL(5,2) NULL,
    pitch DECIMAL(5,2) NULL,
    volume DECIMAL(5,2) NULL,
    voice_name VARCHAR(255) NULL,
    lang VARCHAR(20) NOT NULL DEFAULT 'th-TH',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tts_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT NULL,
    book_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cart_items_book_id (book_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS book_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    user_id INT NULL,
    viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_book_views_book_id (book_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    user_id INT NOT NULL,
    page_number INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bookmarks_book_id (book_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS coin_wallets (
    user_id INT PRIMARY KEY,
    balance INT NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_coin_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS coin_transactions (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
];

const seedCategories = [
  "นิยาย",
  "ความรู้",
  "ธุรกิจ",
  "เทคโนโลยี",
  "ภาษา",
  "สุขภาพ",
  "เด็กและเยาวชน",
];

async function main() {
  for (const statement of statements) {
    await db.query(statement);
  }

  for (const name of seedCategories) {
    await db.query("INSERT IGNORE INTO categories (name) VALUES (?)", [name]);
  }

  console.log("Database schema initialized.");
  await db.end();
}

main().catch(async (error) => {
  console.error("Database initialization failed:", error);
  try {
    await db.end();
  } catch (_) {}
  process.exit(1);
});
