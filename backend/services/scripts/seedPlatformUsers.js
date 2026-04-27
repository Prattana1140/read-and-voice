const bcrypt = require("bcryptjs");

const db = require("../../config/db");

const SAMPLE_PASSWORD = "123456";

const SAMPLE_USERS = [
  {
    key: "reader_nida",
    name: "Nida Reader",
    email: "reader.nida@readvoice.local",
    role: "user",
    status: "active",
    phone: "081-111-0101",
    bio: "Enjoys personal growth books, free daily reads, and listening before bed.",
    accessibilityMode: true,
    visualImpairmentVerified: true,
    walletBalance: 240,
    preferredPlan: "Starter Reader",
  },
  {
    key: "reader_arun",
    name: "Arun Collector",
    email: "reader.arun@readvoice.local",
    role: "user",
    status: "active",
    phone: "081-111-0102",
    bio: "Builds a large digital shelf and leaves thoughtful reviews after finishing each title.",
    walletBalance: 520,
    preferredPlan: "Monthly Plus",
  },
  {
    key: "writer_mali",
    name: "Mali Storyteller",
    email: "writer.mali@readvoice.local",
    role: "writer",
    status: "active",
    phone: "081-111-0201",
    bio: "Writer account used to test publishing, reader engagement, and serial storytelling flows.",
    walletBalance: 860,
    preferredPlan: "Monthly Plus",
    writerProfile: {
      pen_name: "Mali Storyteller",
      page_slug: "mali-storyteller",
      tagline: "Slow fiction, warm endings, and city stories after rain.",
      bio: "Writes cozy serial fiction and keeps a polished public author page for demo purposes.",
      facebook_url: "https://facebook.com/mali.storyteller.demo",
      x_url: "https://x.com/mali_story_demo",
    },
  },
  {
    key: "writer_tan",
    name: "Tan River",
    email: "writer.tan@readvoice.local",
    role: "writer",
    status: "active",
    phone: "081-111-0202",
    bio: "Writer account for testing drafts, units, episodes, and public profile pages.",
    walletBalance: 610,
    preferredPlan: "Quarterly Premium",
    writerProfile: {
      pen_name: "Tan River",
      page_slug: "tan-river",
      tagline: "Mystery serials, compact chapters, and strong cliffhangers.",
      bio: "Maintains multiple seeded books so the writer dashboard and public profile feel populated.",
      facebook_url: "https://facebook.com/tan.river.demo",
      x_url: "https://x.com/tan_river_demo",
    },
  },
  {
    key: "admin_ops",
    name: "Ops Admin",
    email: "admin.ops@readvoice.local",
    role: "admin",
    status: "active",
    phone: "081-111-0301",
    bio: "Moderates content, watches platform health, and can also act like a creator-facing support user.",
    walletBalance: 1250,
    preferredPlan: "Quarterly Premium",
    writerProfile: {
      pen_name: "Ops Admin",
      page_slug: "ops-admin",
      tagline: "Operational account for admin reviews, approvals, and featured picks.",
      bio: "Used to validate admin dashboards, book moderation, and writer-like access to seeded titles.",
      facebook_url: "https://facebook.com/ops.admin.demo",
      x_url: "https://x.com/ops_admin_demo",
    },
  },
  {
    key: "superadmin_core",
    name: "Read and Voice Super Admin",
    email: "superadmin@readvoice.local",
    role: "superadmin",
    status: "active",
    phone: "081-111-0401",
    bio: "Root account for full-access testing across settings, roles, books, and analytics.",
    walletBalance: 2200,
    preferredPlan: "Annual Unlimited",
    writerProfile: {
      pen_name: "Platform Curator",
      page_slug: "platform-curator",
      tagline: "Owns platform-level featured content and final publishing oversight.",
      bio: "Primary demo owner for cross-role verification and full-permission walkthroughs.",
      facebook_url: "https://facebook.com/platform.curator.demo",
      x_url: "https://x.com/platform_curator_demo",
    },
  },
];

const PLAN_DEFINITIONS = [
  {
    name: "Starter Reader",
    description: "7-day entry plan for lightweight reading access.",
    price: 49,
    duration_days: 7,
  },
  {
    name: "Monthly Plus",
    description: "30-day plan for regular readers and audio listeners.",
    price: 199,
    duration_days: 30,
  },
  {
    name: "Quarterly Premium",
    description: "90-day plan for active subscribers and serial readers.",
    price: 499,
    duration_days: 90,
  },
  {
    name: "Annual Unlimited",
    description: "Full-year plan for frequent reading across the entire catalog.",
    price: 1790,
    duration_days: 365,
  },
];

function isWriterLike(role) {
  return ["writer", "admin", "superadmin"].includes(String(role || "").trim());
}

function pickFrom(items, index, fallback = null) {
  if (!items.length) return fallback;
  return items[index % items.length];
}

async function ensureUserProfilesTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INT PRIMARY KEY,
      avatar_url TEXT NULL,
      phone VARCHAR(50) NULL,
      bio TEXT NULL,
      accessibility_mode TINYINT(1) NOT NULL DEFAULT 0,
      visual_impairment_verified TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  try {
    await connection.query(
      "ALTER TABLE user_profiles ADD COLUMN accessibility_mode TINYINT(1) NOT NULL DEFAULT 0 AFTER bio",
    );
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }
  try {
    await connection.query(
      "ALTER TABLE user_profiles ADD COLUMN visual_impairment_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER accessibility_mode",
    );
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }
}

async function ensureWriterProfilesTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS writer_profiles (
      user_id INT PRIMARY KEY,
      pen_name VARCHAR(120) NULL,
      page_slug VARCHAR(160) NULL,
      tagline VARCHAR(255) NULL,
      bio TEXT NULL,
      avatar_url TEXT NULL,
      banner_url TEXT NULL,
      facebook_url VARCHAR(255) NULL,
      x_url VARCHAR(255) NULL,
      pinned_book_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_writer_profiles_page_slug (page_slug),
      CONSTRAINT fk_writer_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_writer_profiles_pinned_book FOREIGN KEY (pinned_book_id) REFERENCES books(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureSubscriptionPlans(connection) {
  for (const plan of PLAN_DEFINITIONS) {
    const [rows] = await connection.query(
      "SELECT id FROM subscription_plans WHERE name = ? LIMIT 1",
      [plan.name],
    );

    if (rows.length) {
      await connection.query(
        `UPDATE subscription_plans
         SET description = ?, price = ?, duration_days = ?, is_active = 1, updated_at = NOW()
         WHERE id = ?`,
        [plan.description, plan.price, plan.duration_days, rows[0].id],
      );
      continue;
    }

    await connection.query(
      `INSERT INTO subscription_plans (name, description, price, duration_days, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [plan.name, plan.description, plan.price, plan.duration_days],
    );
  }
}

async function ensureSampleUsers(connection) {
  const passwordHash = await bcrypt.hash(SAMPLE_PASSWORD, 10);

  for (const user of SAMPLE_USERS) {
    await connection.query(
      `INSERT INTO users (name, email, password, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         password = VALUES(password),
         role = VALUES(role),
         status = VALUES(status),
         updated_at = NOW()`,
      [user.name, user.email, passwordHash, user.role, user.status],
    );
  }

  const [rows] = await connection.query(
    `SELECT id, name, email, role, status
     FROM users
     WHERE email IN (${SAMPLE_USERS.map(() => "?").join(",")})
     ORDER BY id ASC`,
    SAMPLE_USERS.map((user) => user.email),
  );

  return rows;
}

async function resetSampleUserData(connection, userIds) {
  const placeholders = userIds.map(() => "?").join(",");

  const simpleDeletes = [
    "DELETE FROM social_connections WHERE user_id IN (" + placeholders + ")",
    "DELETE FROM gift_codes WHERE user_id IN (" + placeholders + ")",
    "DELETE FROM account_follows WHERE user_id IN (" + placeholders + ")",
    "DELETE FROM user_subscriptions WHERE user_id IN (" + placeholders + ")",
    "DELETE FROM book_reviews WHERE user_id IN (" + placeholders + ")",
    "DELETE FROM reading_progress WHERE user_id IN (" + placeholders + ")",
    "DELETE FROM wishlists WHERE user_id IN (" + placeholders + ")",
    "DELETE FROM `library` WHERE user_id IN (" + placeholders + ")",
    "DELETE FROM cart WHERE user_id IN (" + placeholders + ")",
    "DELETE FROM bookmarks WHERE user_id IN (" + placeholders + ")",
    "DELETE FROM tts_settings WHERE user_id IN (" + placeholders + ")",
    "DELETE FROM user_devices WHERE user_id IN (" + placeholders + ")",
    "DELETE FROM user_benefits WHERE user_id IN (" + placeholders + ")",
    "DELETE FROM coin_transactions WHERE user_id IN (" + placeholders + ")",
    "DELETE FROM coin_wallets WHERE user_id IN (" + placeholders + ")",
  ];

  for (const sql of simpleDeletes) {
    await connection.query(sql, userIds);
  }

  await connection.query(
    `DELETE oi
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.user_id IN (${placeholders})`,
    userIds,
  );

  await connection.query(
    `DELETE FROM orders WHERE user_id IN (${placeholders})`,
    userIds,
  );
}

async function assignSeedBooksToCreators(connection, creatorUsers) {
  const [books] = await connection.query(
    `SELECT id
     FROM books
     WHERE is_published = 1 AND source_type = 'seed'
     ORDER BY id ASC`,
  );

  if (!books.length || !creatorUsers.length) return;

  for (const [index, book] of books.entries()) {
    const owner = creatorUsers[index % creatorUsers.length];
    await connection.query("UPDATE books SET created_by = ? WHERE id = ?", [owner.id, book.id]);
  }
}

async function fetchPlanMap(connection) {
  const [rows] = await connection.query(
    `SELECT id, name, duration_days
     FROM subscription_plans
     ORDER BY duration_days ASC, id ASC`,
  );

  return new Map(rows.map((row) => [row.name, row]));
}

async function fetchCatalogBooks(connection) {
  const [rows] = await connection.query(
    `SELECT id, title, author, price, access_type, content_type, created_by
     FROM books
     WHERE is_published = 1
     ORDER BY id ASC`,
  );

  return rows;
}

async function upsertProfiles(connection, usersByEmail, userBooksMap) {
  for (const sampleUser of SAMPLE_USERS) {
    const user = usersByEmail.get(sampleUser.email);
    if (!user) continue;

    await connection.query(
      `INSERT INTO user_profiles (user_id, avatar_url, phone, bio, accessibility_mode, visual_impairment_verified)
       VALUES (?, '', ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         phone = VALUES(phone),
         bio = VALUES(bio),
         accessibility_mode = VALUES(accessibility_mode),
         visual_impairment_verified = VALUES(visual_impairment_verified),
         updated_at = NOW()`,
      [
        user.id,
        sampleUser.phone,
        sampleUser.bio,
        sampleUser.accessibilityMode ? 1 : 0,
        sampleUser.visualImpairmentVerified ? 1 : 0,
      ],
    );

    if (isWriterLike(sampleUser.role) && sampleUser.writerProfile) {
      const ownedBooks = userBooksMap.get(user.id) || [];
      const pinnedBookId = ownedBooks[0]?.id || null;
      const writer = sampleUser.writerProfile;

      await connection.query(
        `INSERT INTO writer_profiles
         (user_id, pen_name, page_slug, tagline, bio, avatar_url, banner_url, facebook_url, x_url, pinned_book_id)
         VALUES (?, ?, ?, ?, ?, '', '', ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           pen_name = VALUES(pen_name),
           page_slug = VALUES(page_slug),
           tagline = VALUES(tagline),
           bio = VALUES(bio),
           facebook_url = VALUES(facebook_url),
           x_url = VALUES(x_url),
           pinned_book_id = VALUES(pinned_book_id),
           updated_at = NOW()`,
        [
          user.id,
          writer.pen_name,
          writer.page_slug,
          writer.tagline,
          writer.bio,
          writer.facebook_url,
          writer.x_url,
          pinnedBookId,
        ],
      );
    }
  }
}

async function seedUserExperience(connection, usersByEmail, books, planMap) {
  const freeBooks = books.filter((book) => Number(book.price || 0) <= 0);
  const paidBooks = books.filter((book) => Number(book.price || 0) > 0);
  const writerTargets = SAMPLE_USERS.filter((user) => isWriterLike(user.role))
    .map((user) => usersByEmail.get(user.email))
    .filter(Boolean);

  for (const [index, sampleUser] of SAMPLE_USERS.entries()) {
    const user = usersByEmail.get(sampleUser.email);
    if (!user) continue;

    const plan = planMap.get(sampleUser.preferredPlan) || planMap.values().next().value;
    if (plan) {
      await connection.query(
        `INSERT INTO user_subscriptions
         (user_id, plan_id, status, payment_status, start_at, end_at)
         VALUES (?, ?, 'active', 'paid', DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL ? DAY))`,
        [user.id, plan.id, Number(plan.duration_days || 30)],
      );
    }

    const topupAmount = Number(sampleUser.walletBalance || 0) + 250 + index * 25;
    const purchaseSpend = topupAmount - Number(sampleUser.walletBalance || 0);

    await connection.query(
      "INSERT INTO coin_wallets (user_id, balance) VALUES (?, ?)",
      [user.id, sampleUser.walletBalance],
    );

    await connection.query(
      `INSERT INTO coin_transactions
       (user_id, type, amount, balance_after, ref_type, description, created_at)
       VALUES
       (?, 'topup', ?, ?, 'seed', ?, DATE_SUB(NOW(), INTERVAL ? DAY)),
       (?, 'purchase', ?, ?, 'seed', ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
      [
        user.id,
        topupAmount,
        topupAmount,
        `Seed wallet top-up for ${sampleUser.role}`,
        12 - index,
        user.id,
        -purchaseSpend,
        sampleUser.walletBalance,
        `Seed purchase activity for ${sampleUser.role}`,
        11 - index,
      ],
    );

    const paidA = pickFrom(paidBooks, index);
    const paidB = pickFrom(paidBooks, index + 2, paidA);
    const purchasedBooks = [paidA, paidB].filter(Boolean);
    const freeA = pickFrom(freeBooks, index);
    const freeB = pickFrom(freeBooks, index + 1, freeA);
    const libraryBooks = [...new Map([...purchasedBooks, freeA, freeB].filter(Boolean).map((book) => [book.id, book])).values()];

    if (purchasedBooks.length) {
      const totalAmount = purchasedBooks.reduce((sum, book) => sum + Number(book.price || 0), 0);
      const [orderResult] = await connection.query(
        `INSERT INTO orders
         (user_id, total_amount, payment_method, payment_status, order_status, created_at)
         VALUES (?, ?, 'coins', 'paid', 'completed', DATE_SUB(NOW(), INTERVAL ? DAY))`,
        [user.id, totalAmount, 10 - index],
      );

      for (const book of purchasedBooks) {
        await connection.query(
          `INSERT INTO order_items (order_id, book_id, episode_id, quantity, price, created_at)
           VALUES (?, ?, NULL, 1, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
          [orderResult.insertId, book.id, Number(book.price || 0), 10 - index],
        );
      }
    }

    for (const [bookIndex, book] of libraryBooks.entries()) {
      await connection.query(
        "INSERT INTO `library` (user_id, book_id, created_at) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))",
        [user.id, book.id, 9 - bookIndex - index],
      );
    }

    for (const [wishIndex, book] of books.slice(index, index + 3).entries()) {
      await connection.query(
        "INSERT INTO wishlists (user_id, book_id, created_at) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))",
        [user.id, book.id, 4 + wishIndex],
      );
    }

    for (const [progressIndex, book] of libraryBooks.slice(0, 2).entries()) {
      const currentPage = 3 + progressIndex * 2 + index;
      const progressPercent = Math.min(92, 18 + index * 9 + progressIndex * 13);
      await connection.query(
        `INSERT INTO reading_progress
         (user_id, book_id, current_page, last_position, progress_percent, last_read_at)
         VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))`,
        [user.id, book.id, currentPage, currentPage * 240, progressPercent, 6 + progressIndex + index],
      );
    }

    for (const [reviewIndex, book] of libraryBooks.slice(0, 2).entries()) {
      await connection.query(
        `INSERT INTO book_reviews (user_id, book_id, rating, comment, created_at, updated_at)
         VALUES (?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), DATE_SUB(NOW(), INTERVAL ? DAY))`,
        [
          user.id,
          book.id,
          4 + ((index + reviewIndex) % 2),
          `${sampleUser.name} recommends "${book.title}" as part of the seeded reader activity.`,
          3 + reviewIndex,
          3 + reviewIndex,
        ],
      );
    }

    const followedWriter = pickFrom(writerTargets, index);
    if (followedWriter) {
      const followedProfile = SAMPLE_USERS.find((item) => item.email === followedWriter.email);
      await connection.query(
        `INSERT INTO account_follows (user_id, target_type, target_id, target_name, created_at)
         VALUES
         (?, 'writer', ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY)),
         (?, 'category', NULL, ?, DATE_SUB(NOW(), INTERVAL ? DAY)),
         (?, 'book', ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
        [
          user.id,
          followedWriter.id,
          followedProfile?.writerProfile?.pen_name || followedWriter.name,
          8 - index,
          user.id,
          index % 2 === 0 ? "fiction" : "business",
          7 - index,
          user.id,
          pickFrom(books, index)?.id || null,
          pickFrom(books, index)?.title || "Featured catalog title",
          6 - index,
        ],
      );
    }

    await connection.query(
      `INSERT INTO gift_codes (user_id, code, description, status, created_at, redeemed_at)
       VALUES
       (?, ?, ?, 'available', DATE_SUB(NOW(), INTERVAL 14 DAY), NULL),
       (?, ?, ?, 'redeemed', DATE_SUB(NOW(), INTERVAL 21 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY))`,
      [
        user.id,
        `RV-WELCOME-${user.id}`,
        "Welcome reward for seeded demo account",
        user.id,
        `RV-LISTEN-${user.id}`,
        "Audio unlock reward redeemed during seeded activity",
      ],
    );

    await connection.query(
      `INSERT INTO social_connections
       (user_id, provider, provider_user_id, display_name, email, connected_at, updated_at)
       VALUES
       (?, 'line', ?, ?, ?, DATE_SUB(NOW(), INTERVAL 30 DAY), NOW()),
       (?, 'facebook', ?, ?, ?, DATE_SUB(NOW(), INTERVAL 18 DAY), NOW())`,
      [
        user.id,
        `line-${sampleUser.key}`,
        sampleUser.name,
        sampleUser.email,
        user.id,
        `facebook-${sampleUser.key}`,
        sampleUser.name,
        sampleUser.email,
      ],
    );

    await connection.query(
      `INSERT INTO user_devices (user_id, device_name, platform, last_used_at)
       VALUES
       (?, ?, 'ios', DATE_SUB(NOW(), INTERVAL ? HOUR)),
       (?, ?, 'android', DATE_SUB(NOW(), INTERVAL ? HOUR))`,
      [
        user.id,
        `${sampleUser.name} iPhone`,
        3 + index,
        user.id,
        `${sampleUser.name} Tablet`,
        1 + index,
      ],
    );

    await connection.query(
      `INSERT INTO user_benefits (user_id, title, description, status, expires_at, created_at)
       VALUES
       (?, 'Ad-free reading', 'Seeded premium benefit used to populate the account page.', 'active', DATE_ADD(NOW(), INTERVAL 30 DAY), NOW()),
       (?, 'TTS early access', 'Seeded feature access for text-to-speech playback demos.', 'active', DATE_ADD(NOW(), INTERVAL 45 DAY), NOW())`,
      [user.id, user.id],
    );

    await connection.query(
      `INSERT INTO tts_settings (user_id, rate, pitch, volume, voice_name, lang, updated_at)
       VALUES (?, 1.00, 1.00, 1.00, 'Demo Thai Voice', 'th-TH', NOW())`,
      [user.id],
    );
  }
}

async function main() {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    await ensureUserProfilesTable(connection);
    await ensureWriterProfilesTable(connection);
    await ensureSubscriptionPlans(connection);

    const sampleUsers = await ensureSampleUsers(connection);
    const userIds = sampleUsers.map((user) => Number(user.id));
    const usersByEmail = new Map(sampleUsers.map((user) => [user.email, user]));

    await resetSampleUserData(connection, userIds);

    const creators = SAMPLE_USERS.filter((user) => isWriterLike(user.role))
      .map((user) => usersByEmail.get(user.email))
      .filter(Boolean);

    await assignSeedBooksToCreators(connection, creators);

    const books = await fetchCatalogBooks(connection);
    const planMap = await fetchPlanMap(connection);
    const userBooksMap = new Map();

    for (const creator of creators) {
      userBooksMap.set(
        creator.id,
        books.filter((book) => Number(book.created_by || 0) === Number(creator.id)),
      );
    }

    await upsertProfiles(connection, usersByEmail, userBooksMap);
    await seedUserExperience(connection, usersByEmail, books, planMap);

    await connection.commit();

    console.log("Seeded platform demo users and account activity.");
    console.table(
      SAMPLE_USERS.map((user) => ({
        role: user.role,
        email: user.email,
        password: SAMPLE_PASSWORD,
      })),
    );

    if (!books.length) {
      console.log("No books were found. Run `npm run db:seed:catalog` inside `backend` to populate the catalog.");
    }
  } catch (error) {
    await connection.rollback();
    console.error("Platform user seed failed:", error);
    process.exitCode = 1;
  } finally {
    connection.release();
    await db.end();
  }
}

main();
