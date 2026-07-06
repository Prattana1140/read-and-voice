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
  subscriptionPage: {
    hero_badge: "Read and Voice VIP",
    hero_title: "สมัครสมาชิกพิเศษ อ่านได้คุ้มกว่าเดิม",
    hero_description:
      "เลือกแพ็กเกจที่เหมาะกับจังหวะการอ่านของคุณ แล้วชำระด้วยคอยน์จากกระเป๋าได้ทันที",
    primary_cta: "เลือกแพ็กเกจ",
    secondary_cta: "เติมคอยน์",
    status_title: "สถานะสมาชิก",
    payment_title: "การชำระเงิน",
    payment_note: "หักคอยน์จริงจากกระเป๋าเมื่อกดยืนยันสมัคร",
    plans_kicker: "เลือกแพ็กเกจ",
    plans_title: "จ่ายด้วยคอยน์ เริ่มใช้สิทธิ์ทันที",
    benefits: [
      {
        title: "อ่านเนื้อหาสมาชิก",
        text:
          "เมื่อสมัครแพ็กเกจสำเร็จ ผู้ใช้จะเปิดอ่านหนังสือหรือตอนที่ถูกตั้งค่าเป็นเนื้อหาสำหรับสมาชิกได้ทันที สิทธิ์จะใช้งานได้ตามจำนวนวันที่ระบุในแพ็กเกจที่เลือก",
      },
      {
        title: "ต่ออายุแบบทบวัน",
        text:
          "ถ้าผู้ใช้ยังมีแพ็กเกจเดิมที่ไม่หมดอายุ ระบบจะนำวันใหม่ไปต่อจากวันหมดอายุเดิม ทำให้วันคงเหลือไม่หายเมื่อสมัครแพ็กเกจเพิ่ม",
      },
      {
        title: "ตรวจสอบได้ในประวัติคอยน์",
        text:
          "ทุกครั้งที่สมัคร ระบบจะหักคอยน์จากกระเป๋าและบันทึกรายการไว้ ผู้ใช้จึงตรวจสอบย้อนหลังได้ว่าซื้อแพ็กเกจใด ใช้คอยน์เท่าไร และเริ่มใช้งานเมื่อใด",
      },
      {
        title: "แอดมินแก้ไขได้ไหม?",
        text:
          "แอดมินสามารถแก้รูปภาพ ข้อความ และแพ็กเกจสมาชิกได้จากระบบหลังบ้าน โดยไม่ต้องแก้โค้ด",
      },
    ],
    compare_title: "เปรียบเทียบสิทธิ์",
    compare_general_title: "สมาชิกทั่วไป",
    compare_general_text:
      "เหมาะสำหรับผู้ใช้ที่ต้องการอ่านเฉพาะบางเล่มหรือบางตอน สามารถอ่านเนื้อหาฟรีได้ตามปกติ และซื้อหนังสือหรือตอนที่ต้องการด้วยคอยน์เป็นรายการ ๆ",
    compare_general_bullets: [
      "อ่านหนังสือหรือตอนที่เปิดให้อ่านฟรีได้ทันที",
      "ซื้อเนื้อหาแบบรายเล่มหรือรายตอนได้ด้วยคอยน์",
      "ถ้าเจอเนื้อหาสำหรับสมาชิก จะต้องสมัครแพ็กเกจก่อนจึงเปิดอ่านได้",
    ],
    compare_vip_title: "สมาชิกพิเศษ Read and Voice",
    compare_vip_text:
      "เหมาะสำหรับผู้ใช้ที่อ่านต่อเนื่องหรืออ่านหลายเรื่องในช่วงเวลาเดียวกัน เมื่อสมัครแล้วจะเปิดอ่านเนื้อหาที่กำหนดไว้สำหรับสมาชิกได้ตลอดอายุแพ็กเกจ",
    compare_vip_bullets: [
      "อ่านหนังสือหรือตอนที่ติดป้ายสำหรับสมาชิกได้ตามช่วงวันที่สมัคร",
      "ยังซื้อหนังสือรายเล่มหรือรายตอนได้ด้วยคอยน์เหมือนสมาชิกทั่วไป",
      "ถ้าสมัครเพิ่มก่อนหมดอายุ ระบบจะต่อวันให้จากวันหมดอายุเดิม",
    ],
    faq_title: "คำถามที่พบบ่อย",
    faqs: [
      {
        question: "สมัครแล้วหักคอยน์จริงไหม?",
        answer:
          "หักจริงจากกระเป๋าคอยน์ของผู้ใช้ในขั้นตอนสมัคร ระบบจะตรวจสอบก่อนว่ามีคอยน์เพียงพอหรือไม่ ถ้ายอดพอ ระบบจะหักคอยน์ บันทึกประวัติรายการ และเปิดสิทธิ์สมาชิกให้ใช้งานทันที",
      },
      {
        question: "คอยน์ไม่พอต้องทำอย่างไร?",
        answer:
          "ให้กดปุ่มเติมคอยน์ก่อนสมัคร ระบบจะพาไปหน้ากระเป๋าคอยน์เพื่อเติมยอดให้เพียงพอ หลังจากเติมคอยน์เรียบร้อยแล้ว ผู้ใช้สามารถกลับมาเลือกแพ็กเกจเดิมและสมัครใหม่ได้",
      },
      {
        question: "สมัครซ้ำจะทับแพ็กเกจเดิมไหม?",
        answer:
          "ไม่ทับวันเดิม ถ้าผู้ใช้ยังมีแพ็กเกจที่ใช้งานอยู่ ระบบจะนำวันคงเหลือเดิมเป็นฐาน แล้วเพิ่มจำนวนวันของแพ็กเกจใหม่ต่อจากวันหมดอายุล่าสุด ช่วยให้สมัครล่วงหน้าได้โดยไม่เสียวันคงเหลือ",
      },
      {
        question: "แอดมินสามารถแก้ไขข้อมูลหน้านี้ได้ไหม?",
        answer:
          "แอดมินสามารถแก้รูปภาพ ข้อความประกอบ คำถามที่พบบ่อย และแพ็กเกจสมาชิกได้จากระบบหลังบ้าน โดยไม่ต้องแก้โค้ด",
      },
    ],
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
      subscriptionPage: normalizeSubscriptionPage(parsed.subscriptionPage),
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

function normalizeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeTextList(value, fallback = []) {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item || "").trim()).filter(Boolean);
    return items.length ? items : fallback;
  }

  const items = String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : fallback;
}

function normalizeCards(value, fallback = [], titleKey = "title", textKey = "text") {
  const source = Array.isArray(value) ? value : [];
  const cards = source
    .map((item) => ({
      [titleKey]: normalizeText(item?.[titleKey]),
      [textKey]: normalizeText(item?.[textKey]),
    }))
    .filter((item) => item[titleKey] && item[textKey]);

  return cards.length ? cards : fallback;
}

function normalizeSubscriptionPage(source = {}) {
  const base = defaultConfig.subscriptionPage;
  return {
    ...base,
    ...source,
    hero_badge: normalizeText(source.hero_badge, base.hero_badge),
    hero_title: normalizeText(source.hero_title, base.hero_title),
    hero_description: normalizeText(source.hero_description, base.hero_description),
    primary_cta: normalizeText(source.primary_cta, base.primary_cta),
    secondary_cta: normalizeText(source.secondary_cta, base.secondary_cta),
    status_title: normalizeText(source.status_title, base.status_title),
    payment_title: normalizeText(source.payment_title, base.payment_title),
    payment_note: normalizeText(source.payment_note, base.payment_note),
    plans_kicker: normalizeText(source.plans_kicker, base.plans_kicker),
    plans_title: normalizeText(source.plans_title, base.plans_title),
    benefits: normalizeCards(source.benefits, base.benefits),
    compare_title: normalizeText(source.compare_title, base.compare_title),
    compare_general_title: normalizeText(source.compare_general_title, base.compare_general_title),
    compare_general_text: normalizeText(source.compare_general_text, base.compare_general_text),
    compare_general_bullets: normalizeTextList(
      source.compare_general_bullets,
      base.compare_general_bullets,
    ),
    compare_vip_title: normalizeText(source.compare_vip_title, base.compare_vip_title),
    compare_vip_text: normalizeText(source.compare_vip_text, base.compare_vip_text),
    compare_vip_bullets: normalizeTextList(source.compare_vip_bullets, base.compare_vip_bullets),
    faq_title: normalizeText(source.faq_title, base.faq_title),
    faqs: normalizeCards(source.faqs, base.faqs, "question", "answer"),
  };
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
    subscriptionPage: config.subscriptionPage,
    homeBanners: config.homeBanners,
  });
});

router.post("/subscription-page", verifyToken, requireAdmin, (req, res) => {
  try {
    const config = readConfig();
    config.subscriptionPage = normalizeSubscriptionPage(req.body || {});
    writeConfig(config);

    return res.json({
      message: "บันทึกข้อความหน้าสมัครสมาชิกสำเร็จ",
      subscriptionPage: config.subscriptionPage,
    });
  } catch (error) {
    console.error("POST /page-content/subscription-page error:", error);
    return res.status(500).json({
      message: "บันทึกข้อความหน้าสมัครสมาชิกไม่สำเร็จ",
    });
  }
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
