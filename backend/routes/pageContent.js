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
  homeBanners: [],
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const prefix = file.fieldname === "home_banner" ? "home-banner" : "subscription-hero";
    cb(null, `${prefix}-${Date.now()}${ext}`);
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
      homeBanners: Array.isArray(parsed.homeBanners) ? parsed.homeBanners : [],
    };
  } catch (error) {
    console.error("read page content config error:", error);
    return defaultConfig;
  }
}

function createBannerPayload(source = {}, file = null) {
  const imageUrl = file
    ? `/uploads/page-content/${file.filename}`
    : String(source.image_url || "").trim();

  if (!imageUrl) return null;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    image_url: imageUrl,
    title: String(source.title || "").trim(),
    link_url: String(source.link_url || "").trim(),
    sort_order: Number(source.sort_order || 0),
    is_active: source.is_active === undefined ? true : String(source.is_active) !== "false",
    updated_at: new Date().toISOString(),
  };
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
        message: "อัปเดตรูปภาพหน้าสมัครรายเดือนสำเร็จ",
        subscriptionHero: config.subscriptionHero,
      });
    } catch (error) {
      console.error("POST /page-content/subscription-hero error:", error);
      return res.status(500).json({
        message: "อัปเดตรูปภาพหน้าสมัครรายเดือนไม่สำเร็จ",
      });
    }
  },
);

router.post(
  "/home-banners",
  verifyToken,
  requireAdmin,
  upload.single("home_banner"),
  (req, res) => {
    try {
      const banner = createBannerPayload(req.body, req.file);
      if (!banner) {
        return res.status(400).json({
          message: "กรุณาอัปโหลดรูปภาพหรือกรอก URL รูปภาพโปรโมต",
        });
      }

      const config = readConfig();
      config.homeBanners = [...(config.homeBanners || []), banner]
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
      writeConfig(config);

      return res.json({
        message: "บันทึกแบนเนอร์โปรโมตหน้าแรกสำเร็จ",
        banner,
        homeBanners: config.homeBanners,
      });
    } catch (error) {
      console.error("POST /page-content/home-banners error:", error);
      return res.status(500).json({
        message: "บันทึกแบนเนอร์โปรโมตหน้าแรกไม่สำเร็จ",
      });
    }
  },
);

router.delete("/home-banners/:id", verifyToken, requireAdmin, (req, res) => {
  try {
    const config = readConfig();
    const beforeCount = (config.homeBanners || []).length;
    config.homeBanners = (config.homeBanners || []).filter(
      (banner) => String(banner.id) !== String(req.params.id),
    );

    if (config.homeBanners.length === beforeCount) {
      return res.status(404).json({ message: "ไม่พบแบนเนอร์โปรโมตที่ต้องการลบ" });
    }

    writeConfig(config);
    return res.json({
      message: "ลบแบนเนอร์โปรโมตหน้าแรกสำเร็จ",
      homeBanners: config.homeBanners,
    });
  } catch (error) {
    console.error("DELETE /page-content/home-banners/:id error:", error);
    return res.status(500).json({
      message: "ลบแบนเนอร์โปรโมตหน้าแรกไม่สำเร็จ",
    });
  }
});

router.delete("/subscription-hero", verifyToken, requireAdmin, (_req, res) => {
  try {
    const config = readConfig();
    config.subscriptionHero = {
      image_url: "",
      updated_at: new Date().toISOString(),
    };
    writeConfig(config);

    return res.json({ message: "ลบรูปภาพหน้าสมัครรายเดือนสำเร็จ" });
  } catch (error) {
    console.error("DELETE /page-content/subscription-hero error:", error);
    return res.status(500).json({
      message: "ลบรูปภาพหน้าสมัครรายเดือนไม่สำเร็จ",
    });
  }
});

module.exports = router;
