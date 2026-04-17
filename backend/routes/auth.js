const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const ALLOWED_ROLES = ["user", "writer", "admin", "superadmin"];
const SOCIAL_PROVIDERS = ["facebook", "line", "apple", "google"];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePassword(password) {
  return String(password || "");
}

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET_MISSING");
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function sanitizeUser(user, provider) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status || "active",
    provider,
  };
}

router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = normalizePassword(req.body.password);

    if (!name || !email || !password) {
      return res.status(400).json({ message: "กรอกข้อมูลไม่ครบ" });
    }

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `
      INSERT INTO users (name, email, password, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [name, email, hashedPassword, "user", "active"]
    );

    return res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = normalizePassword(req.body.password);

    if (!email || !password) {
      return res.status(400).json({ message: "กรอกอีเมลและรหัสผ่านให้ครบ" });
    }

    const [users] = await db.query(
      `
      SELECT id, name, email, password, role, status, created_at, updated_at
      FROM users
      WHERE LOWER(TRIM(email)) = ?
      LIMIT 1
      `,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const user = users[0];

    if (!ALLOWED_ROLES.includes(user.role)) {
      return res.status(403).json({
        message: "role นี้ไม่ได้รับอนุญาตให้ใช้งานระบบ",
      });
    }

    if (user.status && user.status !== "active") {
      return res.status(403).json({
        message: "บัญชีนี้ถูกระงับการใช้งาน",
      });
    }

    let isMatch = false;

    if (
      typeof user.password === "string" &&
      (user.password.startsWith("$2a$") ||
        user.password.startsWith("$2b$") ||
        user.password.startsWith("$2y$"))
    ) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = password === String(user.password || "");
    }

    if (!isMatch) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing in .env");
      return res.status(500).json({
        message: "ระบบยังไม่ได้ตั้งค่า JWT_SECRET",
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      token,
      user: sanitizeUser(user, "password"),
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
});

router.post("/social-login", async (req, res) => {
  try {
    const provider = String(req.body.provider || "").trim().toLowerCase();
    const providerId = String(req.body.providerId || "demo").trim();
    const displayName = String(req.body.name || "").trim();
    const email = normalizeEmail(
      req.body.email || `${provider}.${providerId}@read-and-voice.local`
    );

    if (!SOCIAL_PROVIDERS.includes(provider)) {
      return res.status(400).json({ message: "provider ไม่ถูกต้อง" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing in .env");
      return res.status(500).json({
        message: "ระบบยังไม่ได้ตั้งค่า JWT_SECRET",
      });
    }

    const [existingUsers] = await db.query(
      `
      SELECT id, name, email, role, status, created_at, updated_at
      FROM users
      WHERE LOWER(TRIM(email)) = ?
      LIMIT 1
      `,
      [email]
    );

    let user = existingUsers[0];

    if (!user) {
      const fallbackName =
        displayName ||
        `${provider.charAt(0).toUpperCase()}${provider.slice(1)} User`;
      const randomPassword = await bcrypt.hash(
        `${provider}:${providerId}:${Date.now()}`,
        10
      );

      const [result] = await db.query(
        `
        INSERT INTO users (name, email, password, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [fallbackName, email, randomPassword, "user", "active"]
      );

      const [createdUsers] = await db.query(
        `
        SELECT id, name, email, role, status, created_at, updated_at
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [result.insertId]
      );

      user = createdUsers[0];
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      return res.status(403).json({
        message: "role นี้ไม่ได้รับอนุญาตให้ใช้งานระบบ",
      });
    }

    if (user.status && user.status !== "active") {
      return res.status(403).json({
        message: "บัญชีนี้ถูกระงับการใช้งาน",
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      token,
      user: sanitizeUser(user, provider),
    });
  } catch (error) {
    console.error("SOCIAL LOGIN ERROR:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "ไม่ได้ส่ง token" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "ระบบยังไม่ได้ตั้งค่า JWT_SECRET",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [users] = await db.query(
      `
      SELECT id, name, email, role, status, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    }

    return res.status(200).json({
      user: users[0],
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    return res.status(401).json({
      message: "token ไม่ถูกต้องหรือหมดอายุ",
    });
  }
});

module.exports = router;
