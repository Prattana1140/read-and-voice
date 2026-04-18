const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { verifyToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = express.Router();
const dataDir = path.join(__dirname, "../data");
const configPath = path.join(dataDir, "pageContent.json");
const uploadDir = path.join(__dirname, "../uploads/page-content");

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const defaultConfig = {
  subscriptionHero: {
    image_url: "",
    updated_at: null,
  },
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `subscription-hero-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      cb(new Error("อัปโหลดได้เฉพาะไฟล์รูปภาพเท่านั้น"));
      return;
    }

    cb(null, true);
  },
});

function readConfig() {
  try {
    if (!fs.existsSync(configPath)) return defaultConfig;
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));

    return {
      ...defaultConfig,
      ...parsed,
      subscriptionHero: {
        ...defaultConfig.subscriptionHero,
        ...(parsed.subscriptionHero || {}),
      },
    };
  } catch (error) {
    console.error("read page content config error:", error);
    return defaultConfig;
  }
}

function writeConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
}

router.get("/", (_req, res) => {
  return res.json(readConfig());
});

router.post(
  "/subscription-hero",
  verifyToken,
  requireAdmin,
  upload.single("image"),
  (req, res) => {
    try {
      const imageUrl = String(req.body.image_url || "").trim();
      const config = readConfig();

      if (req.file) {
        config.subscriptionHero.image_url = `/uploads/page-content/${req.file.filename}`;
      } else if (imageUrl) {
        config.subscriptionHero.image_url = imageUrl;
      } else {
        return res.status(400).json({
          message: "กรุณาอัปโหลดรูปภาพหรือกรอก URL รูปภาพ",
        });
      }

      config.subscriptionHero.updated_at = new Date().toISOString();
      writeConfig(config);

      return res.json({
        message: "อัปเดตรูปภาพหน้า สมัครรายเดือน สำเร็จ",
        subscriptionHero: config.subscriptionHero,
      });
    } catch (error) {
      console.error("POST /page-content/subscription-hero error:", error);
      return res.status(500).json({
        message: "อัปเดตรูปภาพหน้า สมัครรายเดือน ไม่สำเร็จ",
      });
    }
  },
);

router.delete("/subscription-hero", verifyToken, requireAdmin, (_req, res) => {
  try {
    const config = readConfig();
    config.subscriptionHero = {
      image_url: "",
      updated_at: new Date().toISOString(),
    };
    writeConfig(config);

    return res.json({ message: "ลบรูปภาพหน้า สมัครรายเดือน สำเร็จ" });
  } catch (error) {
    console.error("DELETE /page-content/subscription-hero error:", error);
    return res.status(500).json({
      message: "ลบรูปภาพหน้า สมัครรายเดือน ไม่สำเร็จ",
    });
  }
});

module.exports = router;
