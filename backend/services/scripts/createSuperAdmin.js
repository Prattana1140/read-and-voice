const db = require("../../config/db");
const bcrypt = require("bcryptjs");

async function createOrUpdateSuperAdmin() {
  try {
    const name = "Read & Voice Super Admin";
    const email = "superadmin@readvoice.local";
    const password = "123456";
    const role = "superadmin";
    const status = "active";

    const hashedPassword = await bcrypt.hash(password, 10);

    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (existing.length > 0) {
      await db.query(
        `
        UPDATE users
        SET name = ?, password = ?, role = ?, status = ?, updated_at = NOW()
        WHERE email = ?
        `,
        [name, hashedPassword, role, status, email],
      );

      console.log("อัปเดต superadmin สำเร็จ");
      console.log("email:", email);
      console.log("password:", password);
      process.exit(0);
    }

    await db.query(
      `
      INSERT INTO users (name, email, password, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [name, email, hashedPassword, role, status],
    );

    console.log("สร้าง superadmin สำเร็จ");
    console.log("email:", email);
    console.log("password:", password);
    process.exit(0);
  } catch (error) {
    console.error("createOrUpdateSuperAdmin error:", error);
    process.exit(1);
  }
}

createOrUpdateSuperAdmin();
np
