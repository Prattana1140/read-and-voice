const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();
const uploadDir = path.join(__dirname, "../uploads/profile-images");
const PROFILE_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
const USERNAME_PATTERN = /^[A-Za-z0-9._@-]{4,32}$/;
const GENDER_VALUES = new Set(["male", "female", "other", "prefer_not_to_say"]);
const VISUAL_IMPAIRMENT_VALUES = new Set([
  "not_specified",
  "none",
  "blind",
  "low_vision",
  "other",
  "prefer_not_to_say",
]);
const READING_MODE_VALUES = new Set(["ebook", "audio", "both", "not_sure"]);

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
  limits: { fileSize: PROFILE_IMAGE_MAX_BYTES },
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

function normalizeChoice(value, allowedValues, fallback = null) {
  const normalized = String(value || "").trim();
  if (!normalized) return fallback;
  return allowedValues.has(normalized) ? normalized : fallback;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function normalizeBirthDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const dateOnly = raw.slice(0, 10);
  const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;

  const [, year, month, day] = match;
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return dateOnly;
}

function calculateAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birth.getUTCMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }

  return age;
}

function isAdultAge(age) {
  return Number.isInteger(age) && age >= 18 && age <= 120;
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
          CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      .then(async () => {
        const profileColumnStatements = [
          "ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT NULL FIRST",
          "ALTER TABLE user_profiles ADD COLUMN username VARCHAR(64) NULL AFTER user_id",
          "ALTER TABLE user_profiles ADD COLUMN phone VARCHAR(50) NULL AFTER avatar_url",
          "ALTER TABLE user_profiles ADD COLUMN gender VARCHAR(30) NULL AFTER phone",
          "ALTER TABLE user_profiles ADD COLUMN birth_date DATE NULL AFTER gender",
          "ALTER TABLE user_profiles ADD COLUMN age_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER birth_date",
          "ALTER TABLE user_profiles ADD COLUMN visual_impairment_status VARCHAR(40) NOT NULL DEFAULT 'not_specified' AFTER age_verified",
          "ALTER TABLE user_profiles ADD COLUMN uses_screen_reader TINYINT(1) NOT NULL DEFAULT 0 AFTER visual_impairment_status",
          "ALTER TABLE user_profiles ADD COLUMN assistive_technology VARCHAR(255) NULL AFTER uses_screen_reader",
          "ALTER TABLE user_profiles ADD COLUMN preferred_reading_mode VARCHAR(40) NULL AFTER assistive_technology",
          "ALTER TABLE user_profiles ADD COLUMN province VARCHAR(100) NULL AFTER preferred_reading_mode",
          "ALTER TABLE user_profiles ADD COLUMN accessibility_mode TINYINT(1) NOT NULL DEFAULT 0 AFTER bio",
          "ALTER TABLE user_profiles ADD COLUMN visual_impairment_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER accessibility_mode",
          "ALTER TABLE user_profiles ADD COLUMN terms_accepted_at DATETIME NULL AFTER visual_impairment_verified",
        ];

        for (const statement of profileColumnStatements) {
          try {
            await db.query(statement);
          } catch (error) {
            if (error.code !== "ER_DUP_FIELDNAME") throw error;
          }
        }

        try {
          await db.query(
            "ALTER TABLE user_profiles ADD UNIQUE KEY uq_user_profiles_username (username)",
          );
        } catch (error) {
          if (error.code !== "ER_DUP_KEYNAME") throw error;
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
    username: row.username || "",
    phone: row.phone || "",
    gender: row.gender || "",
    birth_date: row.birth_date || null,
    age: calculateAge(row.birth_date),
    age_verified: Number(row.age_verified || 0) === 1,
    visual_impairment_status: row.visual_impairment_status || "not_specified",
    uses_screen_reader: Number(row.uses_screen_reader || 0) === 1,
    assistive_technology: row.assistive_technology || "",
    preferred_reading_mode: row.preferred_reading_mode || "",
    province: row.province || "",
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
       p.username,
       p.phone,
       p.gender,
       p.birth_date,
       p.age_verified,
       p.visual_impairment_status,
       p.uses_screen_reader,
       p.assistive_technology,
       p.preferred_reading_mode,
       p.province,
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
        ? "ไฟล์รูปมีขนาดใหญ่เกินไป กรุณาเลือกไฟล์ไม่เกิน 15 MB"
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
    const confirmPassword = String(req.body.confirmPassword || "");
    const username = String(req.body.username || "").trim();
    const phone = normalizeOptionalText(req.body.phone, 50);
    const gender = normalizeChoice(req.body.gender, GENDER_VALUES);
    const birthDate = normalizeBirthDate(req.body.birth_date || req.body.birthDate);
    const visualImpairmentStatus = normalizeChoice(
      req.body.visual_impairment_status || req.body.visualImpairmentStatus,
      VISUAL_IMPAIRMENT_VALUES,
      "not_specified",
    );
    const usesScreenReader = normalizeBoolean(
      req.body.uses_screen_reader ?? req.body.usesScreenReader,
    );
    const assistiveTechnology = normalizeOptionalText(
      req.body.assistive_technology || req.body.assistiveTechnology,
      255,
    );
    const preferredReadingMode = normalizeChoice(
      req.body.preferred_reading_mode || req.body.preferredReadingMode,
      READING_MODE_VALUES,
      "both",
    );
    const province = normalizeOptionalText(req.body.province, 100);
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

    if (username && !USERNAME_PATTERN.test(username)) {
      if (req.file) {
        deleteOwnedUpload(toAvatarUrl(req.file));
      }
      return res.status(400).json({
        message: "ยูสเซอร์เนมต้องมี 4-32 ตัวอักษร และใช้ได้เฉพาะ A-Z, a-z, 0-9, ., _, @, -",
      });
    }

    if (birthDate) {
      const age = calculateAge(birthDate);
      if (age === null || age < 0) {
        if (req.file) {
          deleteOwnedUpload(toAvatarUrl(req.file));
        }
        return res.status(400).json({ message: "กรุณาเลือกวันเกิดที่ถูกต้อง" });
      }

      if (age > 120) {
        if (req.file) {
          deleteOwnedUpload(toAvatarUrl(req.file));
        }
        return res.status(400).json({ message: "กรุณาตรวจสอบวันเกิดอีกครั้ง" });
      }
    }

    const [users] = await db.query(
      `SELECT
       u.id,
       u.email,
       u.password,
         p.avatar_url,
         p.age_verified
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

    if (username) {
      const [usernameDuplicates] = await db.query(
        `SELECT user_id
         FROM user_profiles
         WHERE LOWER(TRIM(username)) = ? AND user_id <> ?
         LIMIT 1`,
        [username.toLowerCase(), req.user.id],
      );

      if (usernameDuplicates.length > 0) {
        if (req.file) {
          deleteOwnedUpload(toAvatarUrl(req.file));
        }
        return res.status(400).json({ message: "ยูสเซอร์เนมนี้ถูกใช้งานแล้ว" });
      }
    }

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

    if (currentPassword && !newPassword) {
      if (req.file) {
        deleteOwnedUpload(toAvatarUrl(req.file));
      }
      return res.status(400).json({ message: "กรุณากรอกรหัสผ่านใหม่" });
    }

    if (newPassword) {
      if (!currentPassword) {
        if (req.file) {
          deleteOwnedUpload(toAvatarUrl(req.file));
        }
        return res.status(400).json({
          message: "กรุณากรอกรหัสผ่านปัจจุบันก่อนเปลี่ยนรหัสใหม่",
        });
      }

      if (newPassword.length < 6) {
        if (req.file) {
          deleteOwnedUpload(toAvatarUrl(req.file));
        }
        return res.status(400).json({ message: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" });
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        if (req.file) {
          deleteOwnedUpload(toAvatarUrl(req.file));
        }
        return res.status(400).json({ message: "ยืนยันรหัสผ่านใหม่ไม่ตรงกัน" });
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

    const visualImpairmentVerified = ["blind", "low_vision", "other"].includes(
      visualImpairmentStatus,
    );
    const accessibilityMode =
      usesScreenReader ||
      visualImpairmentVerified ||
      normalizeBoolean(req.body.accessibility_mode);
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
      `INSERT INTO user_profiles (
         user_id,
         username,
         avatar_url,
         phone,
         gender,
         birth_date,
         age_verified,
         visual_impairment_status,
         uses_screen_reader,
         assistive_technology,
         preferred_reading_mode,
         province,
         bio,
         accessibility_mode,
         visual_impairment_verified
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         username = VALUES(username),
         avatar_url = VALUES(avatar_url),
         phone = VALUES(phone),
         gender = VALUES(gender),
         birth_date = VALUES(birth_date),
         age_verified = VALUES(age_verified),
         visual_impairment_status = VALUES(visual_impairment_status),
         uses_screen_reader = VALUES(uses_screen_reader),
         assistive_technology = VALUES(assistive_technology),
         preferred_reading_mode = VALUES(preferred_reading_mode),
         province = VALUES(province),
         bio = VALUES(bio),
         accessibility_mode = VALUES(accessibility_mode),
         visual_impairment_verified = VALUES(visual_impairment_verified),
         updated_at = NOW()`,
      [
        req.user.id,
        username || null,
        nextAvatarUrl,
        phone,
        gender,
        birthDate,
        Number(currentUser.age_verified || 0) === 1 ? 1 : 0,
        visualImpairmentStatus,
        usesScreenReader ? 1 : 0,
        assistiveTechnology,
        preferredReadingMode,
        province,
        bio,
        accessibilityMode ? 1 : 0,
        visualImpairmentVerified ? 1 : 0,
      ],
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
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "อีเมลหรือยูสเซอร์เนมนี้ถูกใช้งานแล้ว" });
    }
    console.error("PUT /profile/me error:", error);
    return res.status(500).json({ message: "อัปเดตโปรไฟล์ไม่สำเร็จ" });
  }
});

router.post("/me/verify-age", verifyToken, async (req, res) => {
  try {
    await ensureUserProfilesTable();

    const confirmedOver18 = normalizeBoolean(
      req.body.confirmed_over_18 ?? req.body.confirmedOver18,
    );
    const declaredAgeRaw = req.body.age ?? req.body.declared_age ?? req.body.declaredAge;
    const declaredAge =
      declaredAgeRaw === undefined || declaredAgeRaw === null || declaredAgeRaw === ""
        ? null
        : Number(declaredAgeRaw);

    const [rows] = await db.query(
      `SELECT
         u.name,
         u.email,
         p.birth_date,
         p.age_verified
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = ?
       LIMIT 1`,
      [req.user.id],
    );

    const current = rows[0];
    if (!current) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    }

    if (Number(current.age_verified || 0) === 1) {
      const profile = await fetchProfile(req.user.id);
      return res.json({ message: "บัญชีนี้ยืนยันอายุแล้ว", profile });
    }

    let canVerify = false;
    const calculatedAge = calculateAge(current.birth_date);

    if (calculatedAge !== null && !isAdultAge(calculatedAge)) {
      return res.status(403).json({
        message: "บัญชีนี้ยังมีอายุไม่ถึง 18 ปี จึงไม่สามารถเข้าถึงเนื้อหา 18+ ได้",
      });
    }

    if (confirmedOver18) {
      canVerify = true;
    } else if (declaredAge !== null) {
      if (!Number.isInteger(declaredAge) || declaredAge < 0 || declaredAge > 120) {
        return res.status(400).json({ message: "กรุณากรอกอายุเป็นตัวเลขที่ถูกต้อง" });
      }

      if (calculatedAge === null) {
        return res.status(400).json({
          message: "กรุณาบันทึกวันเกิดในโปรไฟล์ก่อนยืนยันอายุ",
        });
      }

      if (declaredAge !== calculatedAge) {
        return res.status(400).json({
          message: "อายุที่กรอกไม่ตรงกับวันเกิดในโปรไฟล์",
        });
      }

      canVerify = isAdultAge(calculatedAge);
    }

    if (!canVerify) {
      return res.status(400).json({
        message: "บัญชีนี้ยังไม่ผ่านเงื่อนไขอายุ 18 ปีขึ้นไป",
      });
    }

    await db.query(
      `INSERT INTO user_profiles (user_id, age_verified)
       VALUES (?, 1)
       ON DUPLICATE KEY UPDATE age_verified = 1, updated_at = NOW()`,
      [req.user.id],
    );

    const profile = await fetchProfile(req.user.id);
    return res.json({ message: "ยืนยันอายุสำเร็จ", profile });
  } catch (error) {
    console.error("POST /profile/me/verify-age error:", error);
    return res.status(500).json({ message: "ยืนยันอายุไม่สำเร็จ" });
  }
});

module.exports = router;
