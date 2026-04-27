const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();
const uploadDir = path.join(__dirname, "../uploads/profile-images");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("อัปโหลดได้เฉพาะไฟล์รูปภาพเท่านั้น"));
    }

    return cb(null, true);
  },
});

let userProfilesTableReady;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeOptionalText(value, maxLength) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return maxLength ? normalized.slice(0, maxLength) : normalized;
}

function toAvatarUrl(file) {
  if (!file) return null;
  return `uploads/profile-images/${file.filename}`;
}

function deleteOwnedUpload(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/");
  if (!normalized.startsWith("uploads/profile-images/")) return;

  const absolutePath = path.join(__dirname, "..", normalized);
  fs.promises.unlink(absolutePath).catch(() => {});
}

async function ensureUserProfilesTable() {
  if (!userProfilesTableReady) {
    userProfilesTableReady = db
      .query(`
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
      `)
      .then(async () => {
        try {
          await db.query(
            "ALTER TABLE user_profiles ADD COLUMN accessibility_mode TINYINT(1) NOT NULL DEFAULT 0 AFTER bio",
          );
        } catch (error) {
          if (error.code !== "ER_DUP_FIELDNAME") throw error;
        }
        try {
          await db.query(
            "ALTER TABLE user_profiles ADD COLUMN visual_impairment_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER accessibility_mode",
          );
        } catch (error) {
          if (error.code !== "ER_DUP_FIELDNAME") throw error;
        }
        return true;
      });
  }

  return userProfilesTableReady;
}

function serializeProfile(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    created_at: row.created_at,
    avatar_url: row.avatar_url || "",
    phone: row.phone || "",
    bio: row.bio || "",
    accessibility_mode: Number(row.accessibility_mode || 0) === 1,
    visual_impairment_verified: Number(row.visual_impairment_verified || 0) === 1,
  };
}

async function fetchProfile(userId) {
  await ensureUserProfilesTable();

  const [rows] = await db.query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.role,
       u.status,
       u.created_at,
       p.avatar_url,
       p.phone,
       p.bio,
       p.accessibility_mode,
       p.visual_impairment_verified
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId],
  );

  return serializeProfile(rows[0] || null);
}

function handleProfileUpload(req, res, next) {
  upload.single("avatar")(req, res, (error) => {
    if (!error) return next();

    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "ไฟล์รูปมีขนาดใหญ่เกินไป"
        : error.message || "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ";

    return res.status(400).json({ message });
  });
}

router.get("/me", verifyToken, async (req, res) => {
  try {
    const profile = await fetchProfile(req.user.id);
    return res.json(profile);
  } catch (error) {
    console.error("GET /profile/me error:", error);
    return res.status(500).json({ message: "ดึงข้อมูลโปรไฟล์ไม่สำเร็จ" });
  }
});

router.put("/me", verifyToken, handleProfileUpload, async (req, res) => {
  try {
    await ensureUserProfilesTable();

    const name = String(req.body.name || req.user.name || "").trim();
    const email = normalizeEmail(req.body.email || req.user.email);
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    const phone = normalizeOptionalText(req.body.phone, 50);
    const bio = normalizeOptionalText(req.body.bio, 2000);
    const avatarUrlInput = normalizeOptionalText(req.body.avatar_url);
    const shouldRemoveAvatar =
      String(req.body.remove_avatar || "")
        .trim()
        .toLowerCase() === "true";

    if (!name || !email) {
      if (req.file) {
        deleteOwnedUpload(toAvatarUrl(req.file));
      }
      return res.status(400).json({ message: "กรุณากรอกชื่อและอีเมล" });
    }

    const [users] = await db.query(
      `SELECT
         u.id,
         u.email,
         u.password,
         p.avatar_url
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = ?
       LIMIT 1`,
      [req.user.id],
    );

    if (users.length === 0) {
      if (req.file) {
        deleteOwnedUpload(toAvatarUrl(req.file));
      }
      return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    }

    const currentUser = users[0];

    if (email !== normalizeEmail(currentUser.email)) {
      const [duplicates] = await db.query(
        "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? AND id <> ? LIMIT 1",
        [email, req.user.id],
      );

      if (duplicates.length > 0) {
        if (req.file) {
          deleteOwnedUpload(toAvatarUrl(req.file));
        }
        return res.status(400).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
      }
    }

    let passwordHash = currentUser.password;

    if (newPassword) {
      if (!currentPassword) {
        if (req.file) {
          deleteOwnedUpload(toAvatarUrl(req.file));
        }
        return res.status(400).json({
          message: "กรุณากรอกรหัสผ่านปัจจุบันก่อนเปลี่ยนรหัสใหม่",
        });
      }

      const passwordText = String(currentUser.password || "");
      const isHashed =
        passwordText.startsWith("$2a$") ||
        passwordText.startsWith("$2b$") ||
        passwordText.startsWith("$2y$");
      const isMatch = isHashed
        ? await bcrypt.compare(currentPassword, passwordText)
        : currentPassword === passwordText;

      if (!isMatch) {
        if (req.file) {
          deleteOwnedUpload(toAvatarUrl(req.file));
        }
        return res.status(400).json({ message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
      }

      passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const previousAvatarUrl = String(currentUser.avatar_url || "").trim();
    let nextAvatarUrl = previousAvatarUrl;

    if (shouldRemoveAvatar) {
      nextAvatarUrl = null;
    } else if (req.file) {
      nextAvatarUrl = toAvatarUrl(req.file);
    } else if (avatarUrlInput !== null) {
      nextAvatarUrl = avatarUrlInput;
    }

    await db.query(
      `UPDATE users
       SET name = ?, email = ?, password = ?, updated_at = NOW()
       WHERE id = ?`,
      [name, email, passwordHash, req.user.id],
    );

    await db.query(
      `INSERT INTO user_profiles (user_id, avatar_url, phone, bio)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         avatar_url = VALUES(avatar_url),
         phone = VALUES(phone),
         bio = VALUES(bio),
         updated_at = NOW()`,
      [req.user.id, nextAvatarUrl, phone, bio],
    );

    if (
      previousAvatarUrl &&
      previousAvatarUrl !== nextAvatarUrl &&
      previousAvatarUrl.startsWith("uploads/profile-images/")
    ) {
      deleteOwnedUpload(previousAvatarUrl);
    }

    const profile = await fetchProfile(req.user.id);

    return res.json({
      message: "อัปเดตโปรไฟล์สำเร็จ",
      profile,
    });
  } catch (error) {
    if (req.file) {
      deleteOwnedUpload(toAvatarUrl(req.file));
    }
    console.error("PUT /profile/me error:", error);
    return res.status(500).json({ message: "อัปเดตโปรไฟล์ไม่สำเร็จ" });
  }
});

module.exports = router;
