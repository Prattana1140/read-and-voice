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
  posterRequests: [],
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const prefix =
      file.fieldname === "home_banner"
        ? "home-banner"
        : file.fieldname === "poster"
          ? "writer-poster"
          : "subscription-hero";
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
      posterRequests: Array.isArray(parsed.posterRequests)
        ? parsed.posterRequests
        : [],
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

function isWriterLike(role) {
  return ["writer", "admin", "superadmin"].includes(role);
}

function createPosterRequestPayload(source = {}, file = null, user = {}) {
  const imageUrl = file
    ? `/uploads/page-content/${file.filename}`
    : String(source.image_url || "").trim();

  if (!imageUrl) return null;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    image_url: imageUrl,
    title: String(source.title || "").trim(),
    subtitle: String(source.subtitle || "").trim(),
    link_url: String(source.link_url || "").trim(),
    book_id: source.book_id ? Number(source.book_id) : null,
    sort_order: Number(source.sort_order || 0),
    status: "pending",
    submitted_by: user.id || null,
    submitted_by_name: user.name || user.email || "",
    reviewed_by: null,
    reviewed_at: null,
    review_note: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function requestToBannerPayload(request = {}, overrides = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    image_url: request.image_url,
    title: String(overrides.title ?? request.title ?? "").trim(),
    link_url: String(overrides.link_url ?? request.link_url ?? "").trim(),
    sort_order: Number(overrides.sort_order ?? request.sort_order ?? 0),
    is_active:
      overrides.is_active === undefined
        ? true
        : String(overrides.is_active) !== "false",
    source_request_id: request.id,
    book_id: request.book_id || null,
    updated_at: new Date().toISOString(),
  };
}

function writeConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
}

router.get("/", (_req, res) => {
  const config = readConfig();
  return res.json({
    subscriptionHero: config.subscriptionHero,
    homeBanners: config.homeBanners,
  });
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

router.post(
  "/writer-posters",
  verifyToken,
  upload.single("poster"),
  (req, res) => {
    try {
      if (!isWriterLike(req.user.role)) {
        return res.status(403).json({ message: "เฉพาะนักเขียนเท่านั้นที่ส่งโปสเตอร์ได้" });
      }

      const posterRequest = createPosterRequestPayload(req.body, req.file, req.user);
      if (!posterRequest) {
        return res.status(400).json({
          message: "กรุณาอัปโหลดโปสเตอร์หรือกรอก URL รูปภาพ",
        });
      }

      const config = readConfig();
      config.posterRequests = [posterRequest, ...(config.posterRequests || [])];
      writeConfig(config);

      return res.status(201).json({
        message: "ส่งโปสเตอร์ให้แอดมินตรวจสอบสำเร็จ",
        posterRequest,
      });
    } catch (error) {
      console.error("POST /page-content/writer-posters error:", error);
      return res.status(500).json({ message: "ส่งโปสเตอร์ไม่สำเร็จ" });
    }
  },
);

router.get("/writer-posters", verifyToken, requireAdmin, (_req, res) => {
  try {
    const config = readConfig();
    return res.json(config.posterRequests || []);
  } catch (error) {
    console.error("GET /page-content/writer-posters error:", error);
    return res.status(500).json({ message: "โหลดรายการโปสเตอร์ไม่สำเร็จ" });
  }
});

router.put(
  "/writer-posters/:id/review",
  verifyToken,
  requireAdmin,
  (req, res) => {
    try {
      const status = String(req.body.status || "").trim().toLowerCase();
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "status ต้องเป็น approved หรือ rejected" });
      }

      const config = readConfig();
      const requestIndex = (config.posterRequests || []).findIndex(
        (request) => String(request.id) === String(req.params.id),
      );

      if (requestIndex < 0) {
        return res.status(404).json({ message: "ไม่พบคำขอโปสเตอร์" });
      }

      const currentRequest = config.posterRequests[requestIndex];
      const reviewedRequest = {
        ...currentRequest,
        status,
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString(),
        review_note: String(req.body.review_note || "").trim(),
        updated_at: new Date().toISOString(),
      };
      config.posterRequests[requestIndex] = reviewedRequest;

      let banner = null;
      if (status === "approved") {
        banner = requestToBannerPayload(reviewedRequest, req.body);
        config.homeBanners = [...(config.homeBanners || []), banner]
          .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
      }

      writeConfig(config);

      return res.json({
        message:
          status === "approved"
            ? "อนุมัติโปสเตอร์และเพิ่มในหน้าเว็บสำเร็จ"
            : "ปฏิเสธโปสเตอร์สำเร็จ",
        posterRequest: reviewedRequest,
        banner,
        homeBanners: config.homeBanners,
      });
    } catch (error) {
      console.error("PUT /page-content/writer-posters/:id/review error:", error);
      return res.status(500).json({ message: "ตรวจสอบโปสเตอร์ไม่สำเร็จ" });
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
