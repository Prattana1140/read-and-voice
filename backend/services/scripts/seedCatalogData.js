const fs = require("fs");
const path = require("path");

const db = require("../../config/db");
const { ensureCatalogAnalyticsSchema } = require("../catalogSchema");

const coverDir = path.join(__dirname, "../../uploads/book-covers");

const subscriptionPlans = [
  {
    name: "Starter Reader",
    description: "อ่านหนังสือและตอนที่กำหนดเป็น subscription ได้ 7 วัน",
    price: 49,
    durationDays: 7,
  },
  {
    name: "Monthly Plus",
    description: "อ่านคอนเทนต์ subscription ได้ 30 วัน",
    price: 199,
    durationDays: 30,
  },
  {
    name: "Quarterly Premium",
    description: "อ่านต่อเนื่องได้ 90 วัน สำหรับผู้อ่านประจำ",
    price: 499,
    durationDays: 90,
  },
  {
    name: "Annual Unlimited",
    description: "แพ็กเกจรายปีสำหรับการอ่านคอนเทนต์ subscription ได้ 365 วัน",
    price: 1790,
    durationDays: 365,
  },
];

const curatedBooks = [
  {
    key: "mindful-morning",
    title: "เช้าวันใหม่อย่างมีสติ",
    subtitle: "แนวทางเริ่มต้นวันด้วยใจที่นิ่งและชัดเจน",
    author: "ทีม Read and Voice",
    description:
      "หนังสือพัฒนาตัวเองสำหรับผู้อ่านที่อยากเริ่มวันใหม่ด้วยจังหวะที่อ่อนโยนแต่มั่นคง",
    categoryHints: ["สุขภาพ", "ความรู้"],
    contentType: "ebook",
    accessType: "free",
    price: 0,
    coinPrice: 0,
    previewMode: "percentage",
    previewValue: 100,
    tags: ["mindfulness", "wellness", "morning"],
    flags: {
      isFreeBook: true,
      isRecommended: true,
      isNewRelease: true,
    },
    signals: {
      readCount: 120,
      reviewCount: 16,
      averageRating: 4.8,
    },
    pages: [
      "เช้าที่ดีไม่ได้เริ่มจากการรีบลุกแล้ววิ่งเข้าหางาน แต่เริ่มจากการรับรู้ร่างกายและอารมณ์ของตัวเองให้ทันก่อนโลกภายนอกจะเคลื่อนเข้ามา",
      "เมื่อเราให้เวลากับลมหายใจสั้น ๆ ก่อนเปิดหน้าจอ ความเร่งรีบจะไม่ลากเราไปทั้งวัน การเลือกจังหวะเช้าจึงเป็นการเลือกคุณภาพชีวิตทั้งวันด้วย",
      "ความนิ่งไม่ได้แปลว่าช้า แต่คือการมีพื้นที่พอจะตัดสินใจให้ดีกว่าเดิมในทุกเรื่องเล็กน้อย",
    ],
  },
  {
    key: "productivity-lab",
    title: "ห้องทดลองคนทำงานลื่นไหล",
    subtitle: "ออกแบบระบบงานที่โฟกัสและไม่ล้า",
    author: "ศิริกานต์ วรากร",
    description:
      "คู่มือสำหรับคนทำงานยุคใหม่ที่ต้องการจัดระบบงานให้ชัด ลื่น และวัดผลได้จริง",
    categoryHints: ["ธุรกิจ", "ความรู้"],
    contentType: "ebook",
    accessType: "paid",
    price: 129,
    coinPrice: 129,
    previewMode: "percentage",
    previewValue: 20,
    tags: ["productivity", "focus", "work"],
    flags: {
      isPromotion: true,
      isBestSeller: true,
      isRecommended: true,
    },
    promoDiscountPercent: 35,
    promoDurationDays: 10,
    signals: {
      readCount: 260,
      reviewCount: 24,
      averageRating: 4.7,
    },
    pages: [
      "ระบบงานที่ดีคือระบบที่กลับมาใช้ซ้ำได้จริงในวันที่ยุ่งที่สุด ไม่ใช่ระบบที่ดูดีเฉพาะตอนวางแผน",
      "การโฟกัสระยะยาวเริ่มจากการจัดการพลังงาน ไม่ใช่การบังคับใจเพียงอย่างเดียว เราจึงต้องออกแบบทั้งเวลา งาน และพื้นที่พักให้พอดีกัน",
      "เมื่อเรามองงานเป็นระบบทดลอง เราจะกล้าตัดสิ่งไม่จำเป็นออก และค่อย ๆ สร้างวิธีทำงานที่เหมาะกับชีวิตจริงของตัวเอง",
    ],
  },
  {
    key: "future-readers",
    title: "อนาคตของผู้อ่านดิจิทัล",
    subtitle: "เทรนด์การอ่าน เสียง และประสบการณ์ใหม่ของคอนเทนต์",
    author: "วายุ ดุรงค์",
    description:
      "สำรวจอนาคตของการอ่านดิจิทัล การฟัง และการออกแบบประสบการณ์คอนเทนต์แบบผสม",
    categoryHints: ["เทคโนโลยี", "ธุรกิจ"],
    contentType: "ebook",
    accessType: "subscription",
    price: 89,
    coinPrice: 89,
    previewMode: "percentage",
    previewValue: 15,
    tags: ["digital", "audio", "publishing"],
    flags: {
      isNewRelease: true,
      isRecommended: true,
    },
    signals: {
      readCount: 180,
      reviewCount: 18,
      averageRating: 4.6,
    },
    pages: [
      "ผู้อ่านยุคใหม่ไม่ได้แยกการอ่านออกจากการฟังอีกต่อไป พวกเขาสลับรูปแบบการเสพคอนเทนต์ตามบริบทของชีวิตระหว่างวัน",
      "แพลตฟอร์มที่ชนะจะไม่ใช่แค่มีคอนเทนต์มาก แต่ต้องช่วยให้ผู้อ่านค้นพบสิ่งที่ตรงใจได้ต่อเนื่องบนทุกอุปกรณ์",
      "คอนเทนต์ที่ดีในอนาคตจึงต้องคิดตั้งแต่ต้นว่าจะถูกอ่าน ถูกฟัง และถูกแชร์อย่างไรให้คุณค่าเดิมยังครบถ้วน",
    ],
  },
  {
    key: "slow-river-home",
    title: "บ้านปลายแม่น้ำช้า",
    subtitle: "บันทึกการกลับไปเจอชีวิตที่ไม่รีบ",
    author: "พิมพ์ดาว วนิดา",
    description:
      "วรรณกรรมอบอุ่นว่าด้วยบ้าน ครอบครัว และความเงียบที่เยียวยาหัวใจหลังวันที่ยาวนาน",
    categoryHints: ["วรรณกรรม", "นิยาย"],
    contentType: "ebook",
    accessType: "free",
    price: 0,
    coinPrice: 0,
    previewMode: "percentage",
    previewValue: 100,
    tags: ["family", "healing", "literary"],
    flags: {
      isFreeBook: true,
      isHallOfFame: true,
      isRecommended: true,
    },
    signals: {
      readCount: 220,
      reviewCount: 20,
      averageRating: 4.9,
    },
    pages: [
      "บ้านหลังเดิมไม่เคยถามว่าทำไมเราถึงกลับช้า มันเพียงเปิดไฟรอและปล่อยให้เราค่อย ๆ วางความเหนื่อยลงทีละชิ้น",
      "แม่น้ำที่ไหลผ่านหน้าบ้านทำให้เธอเรียนรู้ว่าบางครั้งการไปต่อไม่ได้แปลว่าต้องเร่ง แต่อาจหมายถึงการยอมให้ใจช้าลงพอจะเห็นสิ่งสำคัญ",
      "เมื่อเรากลับมาเจอรากของตัวเองอีกครั้ง เรามักพบว่าความกล้าหาญไม่ใช่การหนีไปไกล แต่คือการอยู่กับความจริงอย่างอ่อนโยน",
    ],
  },
];

const serialSeries = [
  {
    key: "city-after-rain",
    title: "เมืองหลังฝน",
    subtitle: "นิยายลึกลับในคืนที่ฟ้าปิด",
    author: "มนนภา ศรีดารา",
    description:
      "เรื่องราวของเมืองที่เก็บความลับเอาไว้ทุกครั้งหลังฝนตกหนัก และคนกลุ่มหนึ่งที่เริ่มได้ยินมันพร้อมกัน",
    categoryHints: ["นิยาย"],
    accessType: "subscription",
    flags: {
      isBestSeller: true,
      isRecommended: true,
    },
    signals: {
      readCount: 340,
      reviewCount: 28,
      averageRating: 4.8,
    },
    episodeSignals: [92, 86, 81, 74, 68, 61],
    episodes: [
      "คืนแรกที่ไฟทั้งเมืองดับพร้อมเสียงฝน",
      "เงาสะท้อนในกระจกหน้าร้านที่ไม่มีเจ้าของ",
      "จดหมายสีเทาที่ถูกส่งมาหลังเที่ยงคืน",
      "ทางรถรางสายเก่าซึ่งไม่มีอยู่ในแผนที่แล้ว",
      "คนหายที่กลับมาพร้อมความทรงจำของคนอื่น",
      "เมืองหลังฝนที่เลือกจะพูดในที่สุด",
    ],
  },
  {
    key: "flowers-under-station",
    title: "ดอกไม้ใต้สถานี",
    subtitle: "นิยายอบอุ่นปนลุ้นในเมืองใหญ่",
    author: "อาทิตยา พงศ์ภัค",
    description:
      "ชีวิตของพนักงานกะดึกและร้านดอกไม้ใต้สถานีรถไฟที่ค่อย ๆ เชื่อมผู้คนแปลกหน้าให้กลายเป็นบ้าน",
    categoryHints: ["นิยาย", "วรรณกรรม"],
    accessType: "free",
    flags: {
      isFreeBook: true,
      isNewRelease: true,
      isRecommended: true,
    },
    signals: {
      readCount: 240,
      reviewCount: 18,
      averageRating: 4.7,
    },
    episodeSignals: [70, 66, 62, 58, 54, 50],
    episodes: [
      "ช่อแรกของคืนกะดึก",
      "ผู้โดยสารที่ซื้อดอกไม้ทุกวันพฤหัส",
      "ข้อความบนกระดาษห่อสีครีม",
      "สถานีที่เก็บความลับของคนทั้งเมือง",
      "วันที่ร้านปิดไฟเร็วกว่าปกติ",
      "เช้าสุดท้ายก่อนดอกไม้บานพร้อมกัน",
    ],
  },
  {
    key: "archives-tea",
    title: "หอจดหมายเหตุสีชา",
    subtitle: "แฟนตาซีว่าด้วยความทรงจำที่ถูกเก็บเป็นเอกสาร",
    author: "นนทกร เจตนา",
    description:
      "เมื่อความทรงจำของผู้คนถูกจัดเก็บในหอจดหมายเหตุและเริ่มหายไปทีละหน้า เด็กฝึกงานคนหนึ่งจึงต้องออกตามร่องรอยของอดีต",
    categoryHints: ["แฟนตาซี", "นิยาย"],
    accessType: "subscription",
    flags: {
      isPromotion: true,
      isRecommended: true,
      isHallOfFame: true,
    },
    promoDiscountPercent: 25,
    promoDurationDays: 14,
    signals: {
      readCount: 300,
      reviewCount: 22,
      averageRating: 4.9,
    },
    episodeSignals: [82, 78, 74, 70, 66, 62],
    episodes: [
      "ประตูไม้บานที่สิบสาม",
      "แฟ้มลับซึ่งไม่มีรหัสผู้ฝาก",
      "ชาที่ชงด้วยความทรงจำหนึ่งหยด",
      "คืนตรวจเอกสารที่ไม่มีเงาจันทร์",
      "บทสนทนาของคนที่หายไปจากบันทึก",
      "หน้าสุดท้ายที่ยังเขียนอนาคตได้",
    ],
  },
  {
    key: "shore-without-shadow",
    title: "ชายฝั่งไม่มีเงา",
    subtitle: "ระทึกขวัญเหนือธรรมชาติริมทะเลหมอก",
    author: "กวินตรา เมธา",
    description:
      "หมู่บ้านชายทะเลที่ไม่มีใครยอมออกจากบ้านหลังพระอาทิตย์ตก และเสียงคลื่นที่เรียกชื่อคนเป็นทุกคืน",
    categoryHints: ["สยองขวัญ", "นิยาย"],
    accessType: "paid",
    flags: {
      isBestSeller: true,
      isPromotion: true,
    },
    promoDiscountPercent: 30,
    promoDurationDays: 8,
    signals: {
      readCount: 320,
      reviewCount: 24,
      averageRating: 4.6,
    },
    episodeSignals: [88, 83, 76, 71, 66, 60],
    episodes: [
      "คืนแรกที่เงาของทุกคนหายไป",
      "เรือประมงลำที่กลับมาพร้อมคนไม่ครบ",
      "เสียงเรียกจากหน้าผายามตีสอง",
      "สมุดบันทึกของนายท้ายที่ไม่มีชื่อ",
      "เชือกผูกเรือที่ขยับเองตอนน้ำลง",
      "เช้าสุดท้ายก่อนทะเลคืนทุกอย่างกลับมา",
    ],
  },
];

const palettePresets = [
  { bg: "#F7EFE5", primary: "#243B53", accent: "#FF8A3D", text: "#17212B" },
  { bg: "#EEF5FF", primary: "#1D3557", accent: "#2A9D8F", text: "#16324F" },
  { bg: "#F4F0FF", primary: "#3D2C5A", accent: "#E76F51", text: "#241734" },
  { bg: "#F5FBF2", primary: "#234F3D", accent: "#F4A261", text: "#163022" },
  { bg: "#FFF4EB", primary: "#5B2E48", accent: "#00A6A6", text: "#2B1830" },
  { bg: "#EDF2F7", primary: "#2D3748", accent: "#D53F8C", text: "#111827" },
];

function slugify(value, fallback = "item") {
  const slug = String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return slug || fallback;
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function pickPalette(seed) {
  let hash = 0;
  for (const char of String(seed || "")) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  }

  return palettePresets[hash % palettePresets.length];
}

function splitTitleLines(title) {
  const words = String(title || "").split(" ").filter(Boolean);
  if (words.length <= 2) return [title];
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

function buildCoverSvg(title, subtitle, seed) {
  const palette = pickPalette(seed);
  const titleLines = splitTitleLines(title)
    .slice(0, 2)
    .map(
      (line, index) =>
        `<text x="110" y="${420 + index * 92}" font-size="72" font-weight="800" fill="${palette.text}" font-family="Tahoma, Noto Sans Thai, sans-serif">${escapeXml(line)}</text>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="1600" viewBox="0 0 1200 1600" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="1600" fill="${palette.bg}"/>
  <circle cx="940" cy="250" r="180" fill="${palette.accent}" fill-opacity="0.22"/>
  <rect x="88" y="92" width="1024" height="1416" rx="56" fill="${palette.primary}" fill-opacity="0.08" stroke="${palette.primary}" stroke-opacity="0.18" stroke-width="4"/>
  <rect x="110" y="180" width="320" height="14" rx="7" fill="${palette.primary}"/>
  <rect x="110" y="220" width="240" height="10" rx="5" fill="${palette.primary}" fill-opacity="0.5"/>
  <rect x="110" y="860" width="980" height="360" rx="48" fill="${palette.primary}"/>
  <circle cx="260" cy="1040" r="106" fill="${palette.accent}" fill-opacity="0.28"/>
  <circle cx="388" cy="980" r="64" fill="${palette.bg}" fill-opacity="0.55"/>
  <path d="M560 980C670 900 780 870 904 878C972 882 1032 898 1090 928V1220H560V980Z" fill="${palette.accent}" fill-opacity="0.9"/>
  ${titleLines}
  <text x="110" y="620" font-size="30" font-weight="500" fill="${palette.text}" fill-opacity="0.72" font-family="Tahoma, Noto Sans Thai, sans-serif">${escapeXml(subtitle || "")}</text>
  <text x="110" y="1318" font-size="36" font-weight="700" fill="${palette.bg}" font-family="Tahoma, Noto Sans Thai, sans-serif">${escapeXml(title)}</text>
  <text x="110" y="1370" font-size="24" font-weight="500" fill="${palette.bg}" fill-opacity="0.75" font-family="Tahoma, Noto Sans Thai, sans-serif">${escapeXml(subtitle || "Read and Voice Original")}</text>
</svg>`;
}

function ensureCoverFiles(books) {
  fs.mkdirSync(coverDir, { recursive: true });

  for (const book of books) {
    const filename = `${book.key}.svg`;
    const filepath = path.join(coverDir, filename);
    fs.writeFileSync(
      filepath,
      buildCoverSvg(book.title, book.subtitle, book.key),
      "utf8",
    );
    book.coverFile = filename;
  }
}

function buildRatings(targetAverage, count) {
  const safeCount = Math.max(1, count);
  const targetTotal = Math.round(Math.max(1, Math.min(5, targetAverage)) * safeCount);
  const ratings = Array.from({ length: safeCount }, () => Math.max(4, Math.round(targetAverage)));
  let currentTotal = ratings.reduce((sum, rating) => sum + rating, 0);

  for (let index = safeCount - 1; currentTotal > targetTotal && index >= 0; index -= 1) {
    if (ratings[index] > 1) {
      ratings[index] -= 1;
      currentTotal -= 1;
    }
  }

  for (let index = 0; currentTotal < targetTotal && index < safeCount; index += 1) {
    if (ratings[index] < 5) {
      ratings[index] += 1;
      currentTotal += 1;
    }
  }

  return ratings;
}

async function getTableColumns(tableName) {
  const [rows] = await db.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName],
  );

  return new Set(rows.map((row) => row.COLUMN_NAME));
}

async function ensurePlans() {
  for (const plan of subscriptionPlans) {
    const [rows] = await db.query(
      "SELECT id FROM subscription_plans WHERE name = ? LIMIT 1",
      [plan.name],
    );

    if (rows.length > 0) {
      await db.query(
        `UPDATE subscription_plans
         SET description = ?, price = ?, duration_days = ?, is_active = 1, updated_at = NOW()
         WHERE id = ?`,
        [plan.description, plan.price, plan.durationDays, rows[0].id],
      );
      continue;
    }

    await db.query(
      `INSERT INTO subscription_plans (name, description, price, duration_days, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [plan.name, plan.description, plan.price, plan.durationDays],
    );
  }
}

async function getAllCategories() {
  const [scopeColumns] = await db.query("SHOW COLUMNS FROM categories LIKE 'content_scope'");
  const hasContentScope = scopeColumns.length > 0;
  const [rows] = await db.query(
    `SELECT id, name
     FROM categories
     ${hasContentScope ? "WHERE content_scope IN ('all', 'ebook')" : ""}
     ORDER BY id ASC`,
  );

  return rows;
}

async function getCategoryId(categoryHints) {
  const [scopeColumns] = await db.query("SHOW COLUMNS FROM categories LIKE 'content_scope'");
  const hasContentScope = scopeColumns.length > 0;
  for (const hint of categoryHints || []) {
    const [rows] = await db.query(
      hasContentScope
        ? "SELECT id FROM categories WHERE name = ? AND content_scope IN ('all', 'ebook') LIMIT 1"
        : "SELECT id FROM categories WHERE name = ? LIMIT 1",
      [hint],
    );
    if (rows.length > 0) return rows[0].id;
  }

  const [fallbackRows] = await db.query(
    hasContentScope
      ? "SELECT id FROM categories WHERE content_scope IN ('all', 'ebook') ORDER BY id ASC LIMIT 1"
      : "SELECT id FROM categories ORDER BY id ASC LIMIT 1",
  );
  return fallbackRows[0]?.id || null;
}

async function getCreatorId() {
  const [rows] = await db.query(
    `SELECT id
     FROM users
     WHERE role IN ('writer', 'admin', 'superadmin')
     ORDER BY FIELD(role, 'superadmin', 'admin', 'writer'), id ASC
     LIMIT 1`,
  );

  return rows[0]?.id || null;
}

function buildBookPayload(book, categoryId, creatorId, columns) {
  const coverPath = `/uploads/book-covers/${book.coverFile}`;
  const fullText = (book.pages || []).join("\n\n");
  const flags = book.flags || {};
  const payload = {};

  const assign = (column, value) => {
    if (columns.has(column) && value !== undefined) {
      payload[column] = value;
    }
  };

  const promoDurationDays = Number(book.promoDurationDays || 0);
  const promoStartAt = promoDurationDays > 0 ? new Date() : null;
  const promoEndAt =
    promoDurationDays > 0
      ? new Date(Date.now() + promoDurationDays * 24 * 60 * 60 * 1000)
      : null;

  assign("slug", slugify(book.title, book.key));
  assign("title", book.title);
  assign("subtitle", book.subtitle);
  assign("author", book.author);
  assign("author_name", book.author);
  assign("description", book.description);
  assign("category_id", categoryId);
  assign("cover_image", coverPath);
  assign("cover_image_url", coverPath);
  assign("source_type", "seed");
  assign("content_type", book.contentType);
  assign("serial_status", book.contentType === "serial" ? book.serialStatus || "ongoing" : "completed");
  assign("latest_episode_at", book.contentType === "serial" ? new Date() : null);
  assign("access_type", book.accessType);
  assign("process_status", "completed");
  assign("full_text", fullText);
  assign("total_pages", (book.pages || []).length);
  assign("is_published", 1);
  assign("created_by", creatorId);
  assign("price", Number(book.price || 0));
  assign("coin_price", Number(book.coinPrice ?? book.price ?? 0));
  assign("promo_discount_percent", Number(book.promoDiscountPercent || 0));
  assign("promo_start_at", promoStartAt);
  assign("promo_end_at", promoEndAt);
  assign("preview_mode", book.previewMode || "percentage");
  assign("preview_value", Number(book.previewValue || 20));
  assign("preview_page_limit", Math.min((book.pages || []).length || 1, 2));
  assign("preview_char_limit", 1200);
  assign("lifecycle_status", "published");
  assign("publishing_status", "ready");
  assign("approval_status", "approved");
  assign("requested_best_seller", flags.isBestSeller ? 1 : 0);
  assign("requested_new_release", flags.isNewRelease ? 1 : 0);
  assign("requested_promotion", flags.isPromotion ? 1 : 0);
  assign("requested_free_book", flags.isFreeBook || book.accessType === "free" ? 1 : 0);
  assign("requested_hall_of_fame", flags.isHallOfFame ? 1 : 0);
  assign("requested_recommended", flags.isRecommended ? 1 : 0);
  assign("is_best_seller", flags.isBestSeller ? 1 : 0);
  assign("is_new_release", flags.isNewRelease ? 1 : 0);
  assign("is_promotion", flags.isPromotion ? 1 : 0);
  assign("is_free_book", flags.isFreeBook || book.accessType === "free" ? 1 : 0);
  assign("is_hall_of_fame", flags.isHallOfFame ? 1 : 0);
  assign("is_recommended", flags.isRecommended ? 1 : 0);
  assign("language_code", "th");
  assign("age_rating", "ทั่วไป");
  assign("created_at", new Date());
  assign("updated_at", new Date());

  return payload;
}

async function upsertBookTags(bookId, tags) {
  try {
    await db.query("DELETE FROM book_tag_maps WHERE book_id = ?", [bookId]);
  } catch (_) {
    return;
  }

  for (const tag of tags || []) {
    await db.query("INSERT IGNORE INTO book_tags (name) VALUES (?)", [tag]);
    const [rows] = await db.query(
      "SELECT id FROM book_tags WHERE name = ? LIMIT 1",
      [tag],
    );
    if (rows.length > 0) {
      await db.query(
        "INSERT IGNORE INTO book_tag_maps (book_id, tag_id) VALUES (?, ?)",
        [bookId, rows[0].id],
      );
    }
  }
}

async function replaceBookPages(bookId, pages) {
  await db.query("DELETE FROM book_pages WHERE book_id = ?", [bookId]);

  for (let index = 0; index < pages.length; index += 1) {
    await db.query(
      `INSERT INTO book_pages (book_id, page_number, page_text)
       VALUES (?, ?, ?)`,
      [bookId, index + 1, pages[index]],
    );
  }
}

function buildEpisodeObjects(series) {
  return series.episodes.map((episodeTitle, index) => {
    const accessType =
      index < 2
        ? "free"
        : series.accessType === "paid" && index >= 4
          ? "subscription"
          : series.accessType;

    const price =
      accessType === "paid"
        ? 19 + index * 3
        : 0;

    return {
      episodeNumber: index + 1,
      title: episodeTitle,
      content: `${episodeTitle}\n\n${series.title} ตอนที่ ${index + 1} เปิดเรื่องด้วยแรงตึงของความลับและความสัมพันธ์ที่ค่อย ๆ เผยตัวผ่านรายละเอียดเล็กน้อยในทุกฉาก\n\nตัวละครหลักเริ่มมองเห็นเงื่อนที่ซ่อนอยู่ในเมืองเดียวกัน แต่แต่ละคนตีความมันต่างกัน ทำให้ความขัดแย้งค่อย ๆ หนาแน่นขึ้นก่อนจบบท`,
      accessType,
      price,
      signals: {
        readCount: Number(series.episodeSignals[index] || 120),
      },
    };
  });
}

async function syncEpisodes(bookId, episodes) {
  const episodeIds = [];

  for (const episode of episodes || []) {
    const [rows] = await db.query(
      `SELECT id
       FROM book_episodes
       WHERE book_id = ? AND episode_number = ?
       LIMIT 1`,
      [bookId, episode.episodeNumber],
    );

    if (rows.length > 0) {
      episodeIds.push(rows[0].id);
      await db.query(
        `UPDATE book_episodes
         SET title = ?, content = ?, access_type = ?, price = ?, is_free = ?, is_published = 1, updated_at = NOW()
         WHERE id = ?`,
        [
          episode.title,
          episode.content,
          episode.accessType,
          episode.price,
          episode.accessType === "free" || Number(episode.price || 0) <= 0 ? 1 : 0,
          rows[0].id,
        ],
      );
      continue;
    }

    const [result] = await db.query(
      `INSERT INTO book_episodes
       (book_id, episode_number, title, content, price, is_free, access_type, preview_char_limit, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        bookId,
        episode.episodeNumber,
        episode.title,
        episode.content,
        Number(episode.price || 0),
        episode.accessType === "free" || Number(episode.price || 0) <= 0 ? 1 : 0,
        episode.accessType,
        1000,
      ],
    );
    episodeIds.push(result.insertId);
  }

  return episodeIds;
}

async function seedViewRows(tableName, foreignKey, targetId, targetCount) {
  const safeCount = Math.max(0, Number(targetCount || 0));
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM ${tableName}
     WHERE ${foreignKey} = ?`,
    [targetId],
  );

  const currentCount = Number(rows[0]?.total || 0);
  if (currentCount >= safeCount) return;

  const pending = safeCount - currentCount;
  const batchSize = 50;

  for (let start = 0; start < pending; start += batchSize) {
    const size = Math.min(batchSize, pending - start);
    const values = [];
    const placeholders = [];

    for (let index = 0; index < size; index += 1) {
      values.push(targetId, (currentCount + start + index) % 240);
      placeholders.push("(?, NULL, DATE_SUB(NOW(), INTERVAL ? HOUR))");
    }

    await db.query(
      `INSERT INTO ${tableName} (${foreignKey}, user_id, viewed_at)
       VALUES ${placeholders.join(", ")}`,
      values,
    );
  }
}

async function seedBookReviews(bookId, title, targetReviewCount, targetAverage, userIds) {
  if (!userIds.length) return;

  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM book_reviews
     WHERE book_id = ?`,
    [bookId],
  );

  const currentCount = Number(rows[0]?.total || 0);
  const safeTarget = Math.max(currentCount, Number(targetReviewCount || 0));
  if (currentCount >= safeTarget) return;

  const ratings = buildRatings(targetAverage, safeTarget - currentCount);
  const batchSize = 50;

  for (let start = 0; start < ratings.length; start += batchSize) {
    const batch = ratings.slice(start, start + batchSize);
    const values = [];
    const placeholders = [];

    for (let index = 0; index < batch.length; index += 1) {
      const userId = userIds[(start + index) % userIds.length];
      values.push(
        userId,
        bookId,
        batch[index],
        `รีวิวตัวอย่างสำหรับ "${title}" ที่ใช้เติมข้อมูลคะแนนจาก backend โดยตรง`,
      );
      placeholders.push("(?, ?, ?, ?)");
    }

    await db.query(
      `INSERT INTO book_reviews (user_id, book_id, rating, comment)
       VALUES ${placeholders.join(", ")}`,
      values,
    );
  }
}

async function upsertBook(book, bookColumns, creatorId, userIds) {
  const categoryId = await getCategoryId(book.categoryHints);
  const payload = buildBookPayload(book, categoryId, creatorId, bookColumns);
  const entries = Object.entries(payload);
  const columns = entries.map(([column]) => column);
  const values = entries.map(([, value]) => value);

  const [rows] = await db.query(
    "SELECT id FROM books WHERE title = ? LIMIT 1",
    [book.title],
  );

  let bookId;

  if (rows.length > 0) {
    bookId = rows[0].id;
    const assignments = columns.map((column) => `${column} = ?`).join(", ");
    await db.query(
      `UPDATE books
       SET ${assignments}
       WHERE id = ?`,
      [...values, bookId],
    );
  } else {
    const placeholders = columns.map(() => "?").join(", ");
    const [result] = await db.query(
      `INSERT INTO books (${columns.join(", ")})
       VALUES (${placeholders})`,
      values,
    );
    bookId = result.insertId;
  }

  await replaceBookPages(bookId, book.pages || []);
  await upsertBookTags(bookId, book.tags || []);
  await seedViewRows("book_views", "book_id", bookId, book.signals?.readCount);
  await seedBookReviews(
    bookId,
    book.title,
    book.signals?.reviewCount,
    book.signals?.averageRating,
    userIds,
  );

  const episodeIds = await syncEpisodes(bookId, book.episodes || []);
  for (let index = 0; index < episodeIds.length; index += 1) {
    const episode = book.episodes[index];
    await seedViewRows(
      "episode_views",
      "episode_id",
      episodeIds[index],
      episode?.signals?.readCount,
    );
  }
}

function buildGeneratedCategoryBooks(categories) {
  const authorPool = ["ธนา วรินทร์", "รสลิน ภัทรา", "กฤตเมธ อนันต์", "พิมพ์พลอย เรืองรอง"];
  const variants = [
    {
      suffix: "คู่มือเริ่มต้น",
      subtitle: "ฉบับอ่านง่ายสำหรับคนที่อยากเริ่มต้นอย่างมั่นใจ",
      accessType: "free",
      price: 0,
      tags: ["starter", "free-read"],
      flags: { isFreeBook: true, isRecommended: true },
      ratings: { average: 4.5, reviews: 8, reads: 54 },
    },
    {
      suffix: "เล่มเด่นประจำซีซัน",
      subtitle: "เนื้อหาเข้มข้นพร้อมตัวอย่างและเคสใช้งาน",
      accessType: "paid",
      price: 149,
      tags: ["featured", "premium-read"],
      flags: { isPromotion: true, isBestSeller: true },
      promoDiscountPercent: 20,
      promoDurationDays: 7,
      ratings: { average: 4.7, reviews: 12, reads: 86 },
    },
    {
      suffix: "ฉบับลึกสำหรับสมาชิก",
      subtitle: "อ่านต่อได้ยาวแบบเจาะประเด็นสำคัญ",
      accessType: "subscription",
      price: 99,
      tags: ["subscription", "deep-dive"],
      flags: { isNewRelease: true, isRecommended: true, isHallOfFame: true },
      ratings: { average: 4.8, reviews: 10, reads: 68 },
    },
  ];

  return categories.flatMap((category, categoryIndex) =>
    variants.map((variant, variantIndex) => {
      const key = `${slugify(category.name, `cat-${categoryIndex + 1}`)}-${variantIndex + 1}`;
      const author = authorPool[(categoryIndex + variantIndex) % authorPool.length];
      const price = variant.accessType === "free" ? 0 : variant.price + categoryIndex * 3;

      return {
        key,
        title: `${category.name}${variant.suffix}`,
        subtitle: variant.subtitle,
        author,
        description: `หนังสือตัวอย่างในหมวด ${category.name} ที่สร้างขึ้นเพื่อให้ร้านมีข้อมูลครบหลายเล่มต่อหมวด พร้อมใช้งานกับ shelf, promo และระบบสถิติจาก backend`,
        categoryHints: [category.name],
        contentType: "ebook",
        accessType: variant.accessType,
        price,
        coinPrice: price,
        previewMode: "percentage",
        previewValue: variant.accessType === "free" ? 100 : 20,
        tags: [slugify(category.name, "category"), ...variant.tags],
        flags: variant.flags,
        promoDiscountPercent: variant.promoDiscountPercent || 0,
        promoDurationDays: variant.promoDurationDays || 0,
        signals: {
          readCount: variant.ratings.reads + categoryIndex * 17 + variantIndex * 9,
          reviewCount: variant.ratings.reviews + categoryIndex * 3,
          averageRating: variant.ratings.average,
        },
        pages: [
          `หมวด ${category.name} ไม่ได้มีเพียงเนื้อหาให้ค้นหา แต่ยังมีภาษากลางเฉพาะของคนอ่านในหมวดนี้ หนังสือเล่มนี้จึงออกแบบให้เห็นภาพรวมได้ชัดตั้งแต่ต้น`,
          `แต่ละบทจะค่อย ๆ พาผู้อ่านจากเรื่องพื้นฐานไปสู่การใช้จริง พร้อมยกตัวอย่างที่จับต้องได้และอ่านต่อได้ลื่นบนทั้งจอเล็กและจอใหญ่`,
          `เป้าหมายของหนังสือชุดตัวอย่างนี้คือทำให้หน้าร้านมีข้อมูลครบทั้งภาพปก ราคา สิทธิ์เข้าถึง รีวิว และสถิติการอ่านที่ backend ส่งออกมาได้จริง`,
        ],
      };
    }),
  );
}

function buildSerialBooks() {
  return serialSeries.map((series) => ({
    key: series.key,
    title: series.title,
    subtitle: series.subtitle,
    author: series.author,
    description: series.description,
    categoryHints: series.categoryHints,
    contentType: "serial",
    accessType: series.accessType,
    price: 0,
    coinPrice: 0,
    previewMode: "chapter_count",
    previewValue: 2,
    tags: ["serial", slugify(series.title, "serial-story")],
    flags: series.flags,
    promoDiscountPercent: series.promoDiscountPercent || 0,
    promoDurationDays: series.promoDurationDays || 0,
    signals: series.signals,
    pages: [
      `${series.title} เป็นนิยายรายตอนที่เริ่มจากความผิดปกติเล็กน้อยในเมืองธรรมดา ก่อนขยายไปสู่ความลับที่กระทบคนทั้งชุมชน`,
      `ผู้อ่านจะค่อย ๆ เห็นความสัมพันธ์ของตัวละครหลักผ่านตอนสั้นที่จบด้วยแรงดึงให้อยากอ่านต่อ`,
      `ฉบับ seed นี้ออกแบบให้มีหลายตอน หลายสิทธิ์เข้าถึง และยอดอ่านจริงสำหรับใช้ทดสอบหน้า serial และหน้า detail`,
    ],
    episodes: buildEpisodeObjects(series),
  }));
}

async function ensureUserSampleData() {
  const [users] = await db.query(
    `SELECT id, name, email, role
     FROM users
     ORDER BY FIELD(role, 'user', 'writer', 'admin', 'superadmin'), id ASC`,
  );

  if (!users.length) return;

  const [planRows] = await db.query(
    `SELECT id, name, duration_days
     FROM subscription_plans
     ORDER BY duration_days ASC, id ASC`,
  );

  const preferredPlan =
    planRows.find((plan) => plan.name === "Monthly Plus") || planRows[0];

  const [bookRows] = await db.query(
    `SELECT id, title
     FROM books
     WHERE source_type = 'seed'
     ORDER BY id ASC
     LIMIT 12`,
  );

  for (const [index, user] of users.entries()) {
    const [benefitRows] = await db.query(
      "SELECT COUNT(*) AS total FROM user_benefits WHERE user_id = ?",
      [user.id],
    );
    if (Number(benefitRows[0]?.total || 0) === 0) {
      await db.query(
        `INSERT INTO user_benefits (user_id, title, description, status, expires_at)
         VALUES
         (?, 'อ่านแบบไม่มีโฆษณา', 'เปิดใช้งานโหมดอ่านต่อเนื่องโดยไม่มีสิ่งรบกวน', 'active', DATE_ADD(NOW(), INTERVAL 30 DAY)),
         (?, 'สิทธิ์ฟังเสียงบรรยาย', 'ทดลองใช้ฟีเจอร์อ่านออกเสียงสำหรับหนังสือและตอนที่รองรับ', 'active', DATE_ADD(NOW(), INTERVAL 45 DAY))`,
        [user.id, user.id],
      );
    }

    const [deviceRows] = await db.query(
      "SELECT COUNT(*) AS total FROM user_devices WHERE user_id = ?",
      [user.id],
    );
    if (Number(deviceRows[0]?.total || 0) === 0) {
      await db.query(
        `INSERT INTO user_devices (user_id, device_name, platform, last_used_at)
         VALUES
         (?, ?, 'ios', DATE_SUB(NOW(), INTERVAL 1 DAY)),
         (?, ?, 'android', NOW())`,
        [user.id, `${user.name || "Reader"} iPhone`, user.id, `${user.name || "Reader"} Tablet`],
      );
    }

    const [giftRows] = await db.query(
      "SELECT COUNT(*) AS total FROM gift_codes WHERE user_id = ?",
      [user.id],
    );
    if (Number(giftRows[0]?.total || 0) === 0) {
      await db.query(
        `INSERT INTO gift_codes (user_id, code, description, status, redeemed_at)
         VALUES
         (?, ?, 'โค้ดส่วนลดสำหรับนักอ่านประจำ', 'available', NULL),
         (?, ?, 'โค้ดทดลองใช้คอนเทนต์ subscription', 'redeemed', DATE_SUB(NOW(), INTERVAL 5 DAY))`,
        [user.id, `RV-WELCOME-${user.id}`, user.id, `RV-TRIAL-${user.id}`],
      );
    }

    const [followRows] = await db.query(
      "SELECT COUNT(*) AS total FROM account_follows WHERE user_id = ?",
      [user.id],
    );
    if (Number(followRows[0]?.total || 0) === 0 && bookRows.length > 0) {
      const pickedBook = bookRows[index % bookRows.length];
      const pickedCategory = index % 2 === 0 ? "นิยาย" : "ความรู้";
      await db.query(
        `INSERT INTO account_follows (user_id, target_type, target_id, target_name)
         VALUES
         (?, 'book', ?, ?),
         (?, 'category', NULL, ?),
         (?, 'author', NULL, ?)`,
        [
          user.id,
          pickedBook.id,
          pickedBook.title,
          user.id,
          pickedCategory,
          user.id,
          index % 2 === 0 ? "ทีม Read and Voice" : "นักเขียนแนะนำ",
        ],
      );
    }

    const [socialRows] = await db.query(
      "SELECT COUNT(*) AS total FROM social_connections WHERE user_id = ?",
      [user.id],
    );
    if (Number(socialRows[0]?.total || 0) === 0) {
      await db.query(
        `INSERT INTO social_connections (user_id, provider, provider_user_id, display_name, email)
         VALUES (?, 'line', ?, ?, ?)`,
        [user.id, `line-${user.id}`, user.name || `Reader ${user.id}`, user.email || null],
      );
    }

    const [subscriptionRows] = await db.query(
      "SELECT COUNT(*) AS total FROM user_subscriptions WHERE user_id = ?",
      [user.id],
    );
    if (preferredPlan && Number(subscriptionRows[0]?.total || 0) === 0) {
      const assignedPlan = planRows[index % planRows.length] || preferredPlan;
      await db.query(
        `INSERT INTO user_subscriptions
         (user_id, plan_id, status, payment_status, start_at, end_at)
         VALUES (?, ?, 'active', 'paid', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL ? DAY))`,
        [user.id, assignedPlan.id, Number(assignedPlan.duration_days || 30)],
      );
    }

    const [reviewRows] = await db.query(
      "SELECT COUNT(*) AS total FROM book_reviews WHERE user_id = ?",
      [user.id],
    );
    if (Number(reviewRows[0]?.total || 0) === 0 && bookRows.length > 0) {
      const reviewBook = bookRows[(index + 1) % bookRows.length];
      await db.query(
        `INSERT INTO book_reviews (user_id, book_id, rating, comment)
         VALUES (?, ?, ?, ?)`,
        [
          user.id,
          reviewBook.id,
          4 + (index % 2),
          `รีวิวตัวอย่างของผู้ใช้ ${user.name || user.id} สำหรับ "${reviewBook.title}"`,
        ],
      );
    }
  }
}

async function main() {
  await ensureCatalogAnalyticsSchema();

  const bookColumns = await getTableColumns("books");
  const creatorId = await getCreatorId();
  const categories = await getAllCategories();
  const [userRows] = await db.query(
    `SELECT id
     FROM users
     ORDER BY id ASC
     LIMIT 6`,
  );
  const userIds = userRows.map((row) => row.id);

  await ensurePlans();

  const booksToSeed = [
    ...curatedBooks,
    ...buildGeneratedCategoryBooks(categories),
    ...buildSerialBooks(),
  ];

  ensureCoverFiles(booksToSeed);

  for (const book of booksToSeed) {
    await upsertBook(book, bookColumns, creatorId, userIds);
  }

  await ensureUserSampleData();

  console.log(
    `Seeded ${booksToSeed.filter((book) => book.contentType === "ebook").length} ebooks and ${booksToSeed.filter((book) => book.contentType === "serial").length} serials with backend-driven promo and stats.`,
  );
  await db.end();
}

main().catch(async (error) => {
  console.error("Catalog seed failed:", error);
  try {
    await db.end();
  } catch (_) {}
  process.exit(1);
});
