// backend/scripts/initSubscriptionTables.js
// ======================================================
// ไฟล์นี้ใช้สร้าง/อัปเดตตารางที่จำเป็นสำหรับ:
// 1) subscription plans
// 2) user subscriptions
// 3) access_type ของ books / book_episodes
//
// รันด้วย:
// node scripts/initSubscriptionTables.js
// ======================================================

const db = require("../config/db");

async function init() {
  try {
    // 1) plans รายเดือน
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT NULL,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        duration_days INT NOT NULL DEFAULT 30,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 2) การสมัครของผู้ใช้
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_id INT NOT NULL,
        status ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
        payment_status ENUM('pending','paid','failed') NOT NULL DEFAULT 'paid',
        start_at DATETIME NOT NULL,
        end_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_user_subscriptions_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_subscriptions_plan
          FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
      )
    `);

    // 3) เพิ่ม status ให้ users ถ้ายังไม่มี
    try {
      await db.query(`
        ALTER TABLE users
        ADD COLUMN status ENUM('active','banned') NOT NULL DEFAULT 'active'
      `);
      console.log("✅ Added users.status");
    } catch (err) {
      if (!String(err.message).includes("Duplicate column")) {
        throw err;
      }
    }

    // 4) เพิ่ม access_type ให้ books ถ้ายังไม่มี
    try {
      await db.query(`
        ALTER TABLE books
        ADD COLUMN access_type ENUM('free','paid','subscription') NOT NULL DEFAULT 'free'
      `);
      console.log("✅ Added books.access_type");
    } catch (err) {
      if (!String(err.message).includes("Duplicate column")) {
        throw err;
      }
    }

    // 5) เพิ่ม price ให้ books ถ้ายังไม่มี
    try {
      await db.query(`
        ALTER TABLE books
        ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0
      `);
      console.log("✅ Added books.price");
    } catch (err) {
      if (!String(err.message).includes("Duplicate column")) {
        throw err;
      }
    }

    // 6) เพิ่ม access_type ให้ episodes ถ้ายังไม่มี
    try {
      await db.query(`
        ALTER TABLE book_episodes
        ADD COLUMN access_type ENUM('free','paid','subscription') NOT NULL DEFAULT 'free'
      `);
      console.log("✅ Added book_episodes.access_type");
    } catch (err) {
      if (!String(err.message).includes("Duplicate column")) {
        throw err;
      }
    }

    // 7) เพิ่ม price ให้ episodes ถ้ายังไม่มี
    try {
      await db.query(`
        ALTER TABLE book_episodes
        ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0
      `);
      console.log("✅ Added book_episodes.price");
    } catch (err) {
      if (!String(err.message).includes("Duplicate column")) {
        throw err;
      }
    }

    // 8) seed แผนรายเดือนเริ่มต้น
    const [plans] = await db.query(`SELECT id FROM subscription_plans LIMIT 1`);
    if (plans.length === 0) {
      await db.query(`
        INSERT INTO subscription_plans (name, description, price, duration_days)
        VALUES
        ('Monthly Basic', 'อ่านหนังสือและตอนที่กำหนดเป็น subscription ได้ 30 วัน', 199.00, 30)
      `);
      console.log("✅ Seeded default monthly plan");
    }

    console.log("🎉 Subscription tables initialized successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ initSubscriptionTables error:", error.message);
    process.exit(1);
  }
}

init();