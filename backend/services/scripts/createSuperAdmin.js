const db = require("../../config/db");
const bcrypt = require("bcryptjs");

function getSuperAdminConfig() {
  const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";
  const email = String(process.env.SUPERADMIN_EMAIL || "superadmin@readvoice.local").trim();
  const password = String(process.env.SUPERADMIN_PASSWORD || "").trim();
  const name = String(process.env.SUPERADMIN_NAME || "Read & Voice Super Admin").trim();

  if (!email) {
    throw new Error("SUPERADMIN_EMAIL is required.");
  }

  if (isProduction && !password) {
    throw new Error("SUPERADMIN_PASSWORD is required when NODE_ENV=production.");
  }

  if (password && password.length < 12) {
    throw new Error("SUPERADMIN_PASSWORD must be at least 12 characters.");
  }

  return {
    name,
    email,
    password: password || "123456",
    role: "superadmin",
    status: "active",
    isProduction,
  };
}

async function createOrUpdateSuperAdmin() {
  try {
    const { name, email, password, role, status, isProduction } = getSuperAdminConfig();

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
      if (isProduction) {
        console.log("password: configured from SUPERADMIN_PASSWORD");
      } else {
        console.log("password:", password);
      }
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
    if (isProduction) {
      console.log("password: configured from SUPERADMIN_PASSWORD");
    } else {
      console.log("password:", password);
    }
    process.exit(0);
  } catch (error) {
    console.error("createOrUpdateSuperAdmin error:", error);
    process.exit(1);
  }
}

createOrUpdateSuperAdmin();
