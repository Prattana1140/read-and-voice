const db = require("../../config/db");
const { getCategoryScope, seedCategories, serialBookCategories } = require("../serialCategories");

const defaultCategoryNameEnByTh = {
  "นิยาย": "Fiction",
  "นิยายรัก": "Romance",
  "นิยายรักวัยรุ่น": "Teen Romance",
  "นิยายรักวัยว้าวุ่น": "Coming-of-age Romance",
  "นิยายโรแมนซ์": "Romance Novel",
  "นิยายรักผู้ใหญ่": "Adult Romance",
  "นิยายรักจีนโบราณ": "Historical Chinese Romance",
  "นิยาย Boy Love Lovely Room": "Boy Love Lovely Room",
  "นิยาย Boy Love Party Room": "Boy Love Party Room",
  "นิยาย Boy Love Secret Room": "Boy Love Secret Room",
  "นิยาย Girl Love Lovely Room": "Girl Love Lovely Room",
  "นิยาย Girl Love Party Room": "Girl Love Party Room",
  "นิยาย Girl Love Secret Room": "Girl Love Secret Room",
  "แฟนตาซี เกมออนไลน์ ต่างโลก": "Fantasy, Online Games, Isekai",
  "แฟนตาซี": "Fantasy",
  "Sci-fi": "Sci-fi",
  "ไซไฟ": "Sci-fi",
  "ผจญภัย แอคชั่น กำลังภายใน": "Adventure, Action, Martial Arts",
  "สืบสวน": "Mystery",
  "ลึกลับ": "Suspense",
  "สยองขวัญ": "Horror",
  "สะท้อนสังคม": "Social Issues",
  "แนวทางเลือก": "Alternative",
  "สาระความรู้": "Knowledge",
  "เรื่องนี้ที่อยากเล่า/ไดอารี่": "Diary",
  "สัพเพเหระ": "Miscellaneous",
  "วรรณกรรมเยาวชน": "Young Adult",
  "ความรู้": "Knowledge",
  "ธุรกิจ": "Business",
  "เทคโนโลยี": "Technology",
  "ภาษา": "Language",
  "สุขภาพ": "Health",
  "เด็กและเยาวชน": "Children and Young Adult",
  "วรรณกรรม": "Literature",
  "โรแมนซ์": "Romance",
  "ดราม่า": "Drama",
  "ตราม่า": "Drama",
  "พัฒนาตนเอง": "Self Improvement",
  "การศึกษา": "Education",
  "คอมพิวเตอร์": "Computer",
  "ไลท์โนเวล": "Light Novel",
  "ตำราเรียน": "Textbook",
  "อื่นๆ": "Others",
};

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
  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id INT PRIMARY KEY,
    username VARCHAR(64) NULL,
    avatar_url TEXT NULL,
    phone VARCHAR(50) NULL,
    gender VARCHAR(30) NULL,
    birth_date DATE NULL,
    age_verified TINYINT(1) NOT NULL DEFAULT 0,
    visual_impairment_status VARCHAR(40) NOT NULL DEFAULT 'not_specified',
    uses_screen_reader TINYINT(1) NOT NULL DEFAULT 0,
    assistive_technology VARCHAR(255) NULL,
    preferred_reading_mode VARCHAR(40) NULL,
    province VARCHAR(100) NULL,
    bio TEXT NULL,
    accessibility_mode TINYINT(1) NOT NULL DEFAULT 0,
    visual_impairment_verified TINYINT(1) NOT NULL DEFAULT 0,
    terms_accepted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_profiles_username (username),
    CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    name_th VARCHAR(255) NULL,
    name_en VARCHAR(255) NULL,
    parent_id INT NULL,
    content_scope VARCHAR(20) NOT NULL DEFAULT 'all',
    display_tone VARCHAR(40) NULL,
    display_art VARCHAR(40) NULL,
    show_on_home TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_categories_parent_id (parent_id),
    INDEX idx_categories_content_scope (content_scope),
    INDEX idx_categories_home_sort (show_on_home, sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(255) NULL,
    title VARCHAR(500) NOT NULL,
    title_th VARCHAR(500) NULL,
    title_en VARCHAR(500) NULL,
    subtitle VARCHAR(500) NULL,
    subtitle_th VARCHAR(500) NULL,
    subtitle_en VARCHAR(500) NULL,
    author_name VARCHAR(255) NULL,
    author_id BIGINT UNSIGNED NULL,
    author VARCHAR(255) NOT NULL,
    description TEXT NULL,
    cover_image_url TEXT NULL,
    category_id INT NULL,
    language_code VARCHAR(20) NOT NULL DEFAULT 'th',
    cover_image TEXT NULL,
    source_type VARCHAR(50) NULL,
    content_type VARCHAR(20) NOT NULL DEFAULT 'ebook',
    serial_status VARCHAR(30) NOT NULL DEFAULT 'completed',
    latest_episode_at DATETIME NULL,
    access_type VARCHAR(20) NOT NULL DEFAULT 'paid',
    lifecycle_status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
    publishing_status ENUM('processing','ready','failed') NOT NULL DEFAULT 'ready',
    process_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    full_text LONGTEXT NULL,
    full_text_th LONGTEXT NULL,
    full_text_en LONGTEXT NULL,
    total_pages INT NOT NULL DEFAULT 0,
    is_published TINYINT(1) NOT NULL DEFAULT 1,
    created_by INT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    coin_price INT NOT NULL DEFAULT 0,
    preview_mode ENUM('none','percentage','chapter_count','sentence_count') NOT NULL DEFAULT 'percentage',
    preview_value INT NOT NULL DEFAULT 10,
    total_units INT NOT NULL DEFAULT 0,
    total_blocks INT NOT NULL DEFAULT 0,
    total_sentences INT NOT NULL DEFAULT 0,
    total_words INT NOT NULL DEFAULT 0,
    total_characters INT NOT NULL DEFAULT 0,
    estimated_reading_minutes INT NOT NULL DEFAULT 0,
    age_rating VARCHAR(30) NULL,
    approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    approval_note TEXT NULL,
    approved_by INT NULL,
    approved_at DATETIME NULL,
    requested_best_seller TINYINT(1) NOT NULL DEFAULT 0,
    requested_new_release TINYINT(1) NOT NULL DEFAULT 0,
    requested_promotion TINYINT(1) NOT NULL DEFAULT 0,
    requested_free_book TINYINT(1) NOT NULL DEFAULT 0,
    requested_hall_of_fame TINYINT(1) NOT NULL DEFAULT 0,
    requested_recommended TINYINT(1) NOT NULL DEFAULT 0,
    is_best_seller TINYINT(1) NOT NULL DEFAULT 0,
    is_new_release TINYINT(1) NOT NULL DEFAULT 0,
    is_promotion TINYINT(1) NOT NULL DEFAULT 0,
    is_free_book TINYINT(1) NOT NULL DEFAULT 0,
    is_hall_of_fame TINYINT(1) NOT NULL DEFAULT 0,
    is_recommended TINYINT(1) NOT NULL DEFAULT 0,
    promo_discount_percent INT NOT NULL DEFAULT 0,
    promo_start_at DATETIME NULL,
    promo_end_at DATETIME NULL,
    preview_page_limit INT NOT NULL DEFAULT 1,
    preview_char_limit INT NOT NULL DEFAULT 1500,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_books_content_type (content_type),
    INDEX idx_books_serial_status (serial_status),
    INDEX idx_books_latest_episode_at (latest_episode_at),
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
    title_th VARCHAR(500) NULL,
    title_en VARCHAR(500) NULL,
    content LONGTEXT NULL,
    content_th LONGTEXT NULL,
    content_en LONGTEXT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_free TINYINT(1) NOT NULL DEFAULT 0,
    access_type VARCHAR(20) NOT NULL DEFAULT 'free',
    is_published TINYINT(1) NOT NULL DEFAULT 1,
    preview_char_limit INT NOT NULL DEFAULT 1500,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_book_episodes_book_episode (book_id, episode_number),
    INDEX idx_book_episodes_book_id (book_id),
    INDEX idx_book_episodes_book_updated (book_id, updated_at),
    CONSTRAINT fk_book_episodes_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS book_pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    page_number INT NOT NULL,
    page_text LONGTEXT NULL,
    page_text_th LONGTEXT NULL,
    page_text_en LONGTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_book_pages_book_page (book_id, page_number),
    CONSTRAINT fk_book_pages_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS book_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    rating INT NOT NULL,
    comment TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_book_reviews_user_id (user_id),
    INDEX idx_book_reviews_book_id (book_id),
    CONSTRAINT fk_book_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_book_reviews_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
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
    payment_method VARCHAR(100) NOT NULL DEFAULT 'coin',
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
  CREATE TABLE IF NOT EXISTS library_hidden (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    hidden_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_library_hidden_user_book (user_id, book_id),
    CONSTRAINT fk_library_hidden_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_library_hidden_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS reading_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    book_unit_id BIGINT UNSIGNED NULL,
    block_id BIGINT UNSIGNED NULL,
    sentence_id BIGINT UNSIGNED NULL,
    sentence_uuid CHAR(36) NULL,
    last_position_ms INT NOT NULL DEFAULT 0,
    last_scroll_offset INT NOT NULL DEFAULT 0,
    reading_mode ENUM('read','listen','read_listen') NOT NULL DEFAULT 'read',
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
  CREATE TABLE IF NOT EXISTS book_tags (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_book_tags_name (name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS book_tag_maps (
    book_id BIGINT UNSIGNED NOT NULL,
    tag_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (book_id, tag_id),
    INDEX idx_book_tag_maps_tag_id (tag_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
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
  `,
  `
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
  `,
  `
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
  `,
  `
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
  CREATE TABLE IF NOT EXISTS episode_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    episode_id INT NOT NULL,
    user_id INT NULL,
    viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_episode_views_episode_id (episode_id),
    INDEX idx_episode_views_user_id (user_id)
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
  CREATE TABLE IF NOT EXISTS subscription_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    duration_days INT NOT NULL DEFAULT 30,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    plan_id INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    payment_status VARCHAR(50) NOT NULL DEFAULT 'paid',
    start_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_subscriptions_user_id (user_id),
    CONSTRAINT fk_user_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
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
  `
  CREATE TABLE IF NOT EXISTS account_follows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    target_type VARCHAR(40) NOT NULL DEFAULT 'book',
    target_id INT NULL,
    target_name VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_account_follows_user (user_id),
    CONSTRAINT fk_account_follows_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS gift_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code VARCHAR(80) NOT NULL,
    description VARCHAR(255) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'available',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    redeemed_at DATETIME NULL,
    UNIQUE KEY uq_gift_codes_user_code (user_id, code),
    INDEX idx_gift_codes_user (user_id),
    CONSTRAINT fk_gift_codes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS user_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    platform VARCHAR(80) NULL,
    last_used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_devices_user (user_id),
    CONSTRAINT fk_user_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS user_benefits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    expires_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_benefits_user (user_id),
    CONSTRAINT fk_user_benefits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS age_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'not_submitted',
    document_type VARCHAR(60) NULL,
    note TEXT NULL,
    submitted_at DATETIME NULL,
    reviewed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_age_verifications_user (user_id),
    CONSTRAINT fk_age_verifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS social_connections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    provider VARCHAR(40) NOT NULL,
    provider_user_id VARCHAR(191) NOT NULL,
    display_name VARCHAR(255) NULL,
    email VARCHAR(255) NULL,
    avatar_url TEXT NULL,
    connected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_social_connections_provider_user (provider, provider_user_id),
    UNIQUE KEY uq_social_connections_user_provider (user_id, provider),
    INDEX idx_social_connections_user (user_id),
    CONSTRAINT fk_social_connections_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS user_notification_settings (
    user_id INT PRIMARY KEY,
    writers TINYINT(1) NOT NULL DEFAULT 1,
    series TINYINT(1) NOT NULL DEFAULT 1,
    promotions TINYINT(1) NOT NULL DEFAULT 0,
    \`system\` TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_notification_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INT PRIMARY KEY,
    reader_json LONGTEXT NULL,
    tts_json LONGTEXT NULL,
    accessibility_json LONGTEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS user_session_revocations (
    user_id INT PRIMARY KEY,
    revoked_after DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_session_revocations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS admin_settings (
    setting_key VARCHAR(120) PRIMARY KEY,
    setting_json LONGTEXT NULL,
    updated_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_admin_settings_updated_by (updated_by),
    CONSTRAINT fk_admin_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS login_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    provider VARCHAR(40) NOT NULL,
    provider_user_id VARCHAR(191) NULL,
    success TINYINT(1) NOT NULL DEFAULT 0,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    message VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_login_events_user (user_id),
    INDEX idx_login_events_provider (provider, provider_user_id),
    INDEX idx_login_events_created_at (created_at),
    CONSTRAINT fk_login_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
  `
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_password_reset_tokens_user (user_id),
    UNIQUE KEY uq_password_reset_tokens_hash (token_hash),
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
];

const seedSubscriptionPlans = [
  {
    name: "Starter Reader",
    description: "อ่านหนังสือและตอนที่กำหนดเป็น subscription ได้ 7 วัน",
    price: 49.0,
    durationDays: 7,
  },
  {
    name: "Monthly Plus",
    description: "อ่านคอนเทนต์ subscription ได้ 30 วัน",
    price: 199.0,
    durationDays: 30,
  },
  {
    name: "Quarterly Premium",
    description: "อ่านต่อเนื่องได้ 90 วัน สำหรับผู้อ่านประจำ",
    price: 499.0,
    durationDays: 90,
  },
  {
    name: "Annual Unlimited",
    description: "แพ็กเกจรายปีสำหรับการอ่านคอนเทนต์ subscription ได้ 365 วัน",
    price: 1790.0,
    durationDays: 365,
  },
];

let initializationPromise;

async function ensureCategoryMetadataColumns() {
  const metadataColumns = [
    ["name_th", "name_th VARCHAR(255) NULL AFTER name"],
    ["name_en", "name_en VARCHAR(255) NULL AFTER name_th"],
    ["parent_id", "parent_id INT NULL AFTER name"],
    ["content_scope", "content_scope VARCHAR(20) NOT NULL DEFAULT 'all' AFTER parent_id"],
    ["display_tone", "display_tone VARCHAR(40) NULL AFTER content_scope"],
    ["display_art", "display_art VARCHAR(40) NULL AFTER display_tone"],
    ["show_on_home", "show_on_home TINYINT(1) NOT NULL DEFAULT 1 AFTER display_art"],
    ["sort_order", "sort_order INT NOT NULL DEFAULT 0 AFTER show_on_home"],
  ];

  for (const [columnName, definition] of metadataColumns) {
    const [columns] = await db.query("SHOW COLUMNS FROM categories LIKE ?", [columnName]);
    if (columns.length === 0) {
      await db.query(`ALTER TABLE categories ADD COLUMN ${definition}`);
    }
  }

  await db.query("UPDATE categories SET name_th = name WHERE name_th IS NULL OR name_th = ''");
  for (const [nameTh, nameEn] of Object.entries(defaultCategoryNameEnByTh)) {
    await db.query(
      "UPDATE categories SET name_en = ? WHERE name = ? AND (name_en IS NULL OR name_en = '')",
      [nameEn, nameTh],
    );
  }
}

async function ensureBookSerialColumns() {
  const bookColumns = [
    ["title_th", "title_th VARCHAR(500) NULL AFTER title"],
    ["title_en", "title_en VARCHAR(500) NULL AFTER title_th"],
    ["subtitle_th", "subtitle_th VARCHAR(500) NULL AFTER subtitle"],
    ["subtitle_en", "subtitle_en VARCHAR(500) NULL AFTER subtitle_th"],
    ["full_text_th", "full_text_th LONGTEXT NULL AFTER full_text"],
    ["full_text_en", "full_text_en LONGTEXT NULL AFTER full_text_th"],
    ["serial_status", "serial_status VARCHAR(30) NOT NULL DEFAULT 'completed' AFTER content_type"],
    ["latest_episode_at", "latest_episode_at DATETIME NULL AFTER serial_status"],
  ];

  for (const [columnName, definition] of bookColumns) {
    const [columns] = await db.query("SHOW COLUMNS FROM books LIKE ?", [columnName]);
    if (columns.length === 0) {
      await db.query(`ALTER TABLE books ADD COLUMN ${definition}`);
    }
  }

  const episodeColumns = [
    ["title_th", "title_th VARCHAR(500) NULL AFTER title"],
    ["title_en", "title_en VARCHAR(500) NULL AFTER title_th"],
    ["content_th", "content_th LONGTEXT NULL AFTER content"],
    ["content_en", "content_en LONGTEXT NULL AFTER content_th"],
  ];

  for (const [columnName, definition] of episodeColumns) {
    const [columns] = await db.query("SHOW COLUMNS FROM book_episodes LIKE ?", [columnName]);
    if (columns.length === 0) {
      await db.query(`ALTER TABLE book_episodes ADD COLUMN ${definition}`);
    }
  }

  const pageColumns = [
    ["page_text_th", "page_text_th LONGTEXT NULL AFTER page_text"],
    ["page_text_en", "page_text_en LONGTEXT NULL AFTER page_text_th"],
  ];

  for (const [columnName, definition] of pageColumns) {
    const [columns] = await db.query("SHOW COLUMNS FROM book_pages LIKE ?", [columnName]);
    if (columns.length === 0) {
      await db.query(`ALTER TABLE book_pages ADD COLUMN ${definition}`);
    }
  }

  await db.query("UPDATE books SET title_th = title WHERE title_th IS NULL OR title_th = ''");
  await db.query("UPDATE books SET subtitle_th = subtitle WHERE subtitle IS NOT NULL AND (subtitle_th IS NULL OR subtitle_th = '')");
  await db.query("UPDATE books SET full_text_th = full_text WHERE full_text IS NOT NULL AND (full_text_th IS NULL OR full_text_th = '')");
  await db.query("UPDATE book_pages SET page_text_th = page_text WHERE page_text IS NOT NULL AND (page_text_th IS NULL OR page_text_th = '')");
  await db.query("UPDATE book_episodes SET title_th = title WHERE title_th IS NULL OR title_th = ''");
  await db.query("UPDATE book_episodes SET content_th = content WHERE content IS NOT NULL AND (content_th IS NULL OR content_th = '')");
}

async function initializeDatabase() {
  for (const statement of statements) {
    await db.query(statement);
  }

  await ensureCategoryMetadataColumns();
  await ensureBookSerialColumns();

  for (const [index, name] of seedCategories.entries()) {
    const isSerialCategory = serialBookCategories.includes(name);
    await db.query(
      `INSERT INTO categories (name, name_th, name_en, content_scope, display_tone, display_art, show_on_home, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE
         name_th = COALESCE(name_th, VALUES(name_th)),
         name_en = COALESCE(name_en, VALUES(name_en)),
         content_scope = VALUES(content_scope),
         display_tone = COALESCE(display_tone, VALUES(display_tone)),
         display_art = COALESCE(display_art, VALUES(display_art)),
         show_on_home = 1,
         sort_order = VALUES(sort_order)`,
      [
        name,
        name,
        defaultCategoryNameEnByTh[name] || name,
        getCategoryScope(name),
        isSerialCategory ? "serial" : "general",
        isSerialCategory ? `serial-${index + 1}` : `general-${index + 1}`,
        index + 1,
      ],
    );
  }

  const [existingPlans] = await db.query(
    "SELECT COUNT(*) AS total FROM subscription_plans"
  );

  if (Number(existingPlans[0]?.total || 0) === 0) {
    for (const plan of seedSubscriptionPlans) {
      await db.query(
        `INSERT INTO subscription_plans (name, description, price, duration_days)
         VALUES (?, ?, ?, ?)`,
        [plan.name, plan.description, plan.price, plan.durationDays]
      );
    }
  }

  console.log("Database schema initialized.");
}

function ensureDatabaseInitialized() {
  if (!initializationPromise) {
    initializationPromise = initializeDatabase().catch((error) => {
      initializationPromise = undefined;
      throw error;
    });
  }

  return initializationPromise;
}

async function main() {
  await ensureDatabaseInitialized();
  await db.end();
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error("Database initialization failed:", error);
    try {
      await db.end();
    } catch (_) {}
    process.exit(1);
  });
}

module.exports = {
  ensureDatabaseInitialized,
};
