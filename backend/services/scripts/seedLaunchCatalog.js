const fs = require("fs");
const path = require("path");
const db = require("../../config/db");
const { getCategoryScope, seedCategories, serialBookCategories } = require("../serialCategories");

const coverDir = path.join(__dirname, "../../uploads/book-covers");
const sourceType = "seed_launch";

const categories = seedCategories;

const coverPalettes = [
  ["#112A46", "#0EA5A0", "#F7D774", "#F8FAFC"],
  ["#3B1D5A", "#E85D75", "#FFD166", "#FFF7ED"],
  ["#12372A", "#3AAFA9", "#F2C14E", "#F7FFF7"],
  ["#1C2541", "#5BC0BE", "#F25F5C", "#F9FAFB"],
  ["#5C2A41", "#F18F01", "#8CD867", "#FFF8F0"],
  ["#253031", "#48ACF0", "#DDF45B", "#F4F9FF"],
];

const ebooks = [
  {
    key: "launch-city-voice",
    title: "เมืองที่อ่านด้วยเสียง",
    author: "ณิชา วรเสียง",
    category: "เทคโนโลยี",
    accessType: "free",
    price: 0,
    coinPrice: 0,
    ageRating: "ทั่วไป",
    subtitle: "นิยายอบอุ่นเกี่ยวกับเมือง แอปอ่านหนังสือ และเสียงที่พาคนกลับมาหากัน",
    description:
      "เมื่อเมืองทั้งเมืองเริ่มใช้ระบบอ่านออกเสียงสำหรับทุกป้ายและทุกหนังสือ โปรแกรมเมอร์สาวคนหนึ่งพบว่าเสียงสังเคราะห์ที่เธอดูแลกำลังเก็บความทรงจำของผู้คนไว้มากกว่าที่ควรจะเป็น",
    tags: ["อ่านง่าย", "เทคโนโลยี", "อบอุ่น"],
  },
  {
    key: "launch-small-garden",
    title: "สวนเล็กหลังวันที่ยาวนาน",
    author: "เขมินท์ พราวฝน",
    category: "สุขภาพ",
    accessType: "paid",
    price: 79,
    coinPrice: 79,
    ageRating: "ทั่วไป",
    subtitle: "คู่มือดูแลใจผ่านการปลูกต้นไม้ การพัก และการจัดจังหวะชีวิต",
    description:
      "หนังสือพัฒนาตนเองที่เล่าผ่านบันทึกสั้น ๆ ของคนทำงานเมืองใหญ่ พร้อมแบบฝึกหัดเล็ก ๆ สำหรับคืนพลังให้ตัวเองหลังวันที่เหนื่อยล้า",
    tags: ["สุขภาพใจ", "พักผ่อน", "พัฒนาตนเอง"],
  },
  {
    key: "launch-rain-bookshop",
    title: "แผนที่ร้านหนังสือกลางฝน",
    author: "ภัทรา ละออง",
    category: "โรแมนซ์",
    accessType: "paid",
    price: 119,
    coinPrice: 119,
    ageRating: "13+",
    subtitle: "ความรักของนักทำแผนที่กับเจ้าของร้านหนังสือที่เปิดเฉพาะวันฝนตก",
    description:
      "ทุกครั้งที่ฝนตก ร้านหนังสือเล็ก ๆ จะปรากฏบนแผนที่เมืองเก่า และพาให้คนสองคนค่อย ๆ อ่านความเงียบของกันและกันจนกลายเป็นบ้าน",
    tags: ["โรแมนซ์", "ร้านหนังสือ", "ฟีลกู้ด"],
  },
  {
    key: "launch-work-heart",
    title: "คู่มือทำงานให้ใจไม่พัง",
    author: "ธนกร มีสมดุล",
    category: "พัฒนาตนเอง",
    accessType: "subscription",
    price: 149,
    coinPrice: 149,
    ageRating: "ทั่วไป",
    subtitle: "ทักษะจัดงาน จัดใจ และคุยกับทีมให้ยังอยากตื่นมาทำงาน",
    description:
      "รวมแนวทางทำงานจริงสำหรับคนที่ต้องรับผิดชอบหลายอย่าง ทั้งการตั้งขอบเขต การสื่อสารกับหัวหน้า และการออกแบบวันทำงานให้ไม่เผาตัวเอง",
    tags: ["งาน", "ทีม", "สมดุลชีวิต"],
  },
  {
    key: "launch-last-station",
    title: "เสียงสุดท้ายจากสถานีเก่า",
    author: "กานต์ชนก ไตรรัตน์",
    category: "สืบสวน",
    accessType: "paid",
    price: 129,
    coinPrice: 129,
    ageRating: "15+",
    subtitle: "คดีหายตัวในสถานีรถไฟร้างที่เหลือเพียงเทปเสียงหนึ่งม้วน",
    description:
      "นักข่าวอิสระกลับไปยังสถานีรถไฟบ้านเกิดเพื่อสืบคดีที่ถูกปิดเงียบมาสิบปี แต่ทุกคำตอบกลับซ่อนอยู่ในเสียงประกาศขบวนสุดท้าย",
    tags: ["สืบสวน", "ลึกลับ", "ดราม่า"],
  },
  {
    key: "launch-starlight-child",
    title: "เด็กหญิงผู้เก็บแสงดาว",
    author: "มินตรา นภาลัย",
    category: "เด็กและเยาวชน",
    accessType: "free",
    price: 0,
    coinPrice: 0,
    ageRating: "ทั่วไป",
    subtitle: "แฟนตาซีสำหรับครอบครัวเกี่ยวกับความกล้าและแสงเล็ก ๆ ในใจ",
    description:
      "เด็กหญิงคนหนึ่งออกเดินทางขึ้นภูเขาเพื่อเก็บแสงดาวมารักษาหมู่บ้าน และได้เรียนรู้ว่าความสว่างที่แท้จริงเริ่มจากการช่วยเหลือกัน",
    tags: ["เยาวชน", "แฟนตาซี", "ครอบครัว"],
  },
  {
    key: "launch-small-system",
    title: "ระบบเล็กที่ทำให้ร้านโต",
    author: "อรินทร์ แก้วการค้า",
    category: "ธุรกิจ",
    accessType: "paid",
    price: 169,
    coinPrice: 169,
    ageRating: "ทั่วไป",
    subtitle: "บทเรียนจากร้านเล็กที่ใช้ข้อมูล สต็อก และบริการลูกค้าอย่างเป็นระบบ",
    description:
      "คู่มือธุรกิจขนาดเล็กที่เล่าจากสถานการณ์จริง ตั้งแต่ตั้งราคาสินค้า จัดการสต็อก ไปจนถึงการใช้ข้อมูลลูกค้าโดยไม่ทำให้ร้านเสียความเป็นมนุษย์",
    tags: ["ธุรกิจ", "ร้านค้า", "ระบบงาน"],
  },
  {
    key: "launch-better-sleep",
    title: "นอนให้เป็น ตื่นให้สด",
    author: "พญ.ลลิตา พักใจ",
    category: "สุขภาพ",
    accessType: "subscription",
    price: 99,
    coinPrice: 99,
    ageRating: "ทั่วไป",
    subtitle: "คู่มือปรับการนอนด้วยวิธีง่าย ๆ ที่ทำได้ในชีวิตประจำวัน",
    description:
      "อธิบายพื้นฐานการนอนอย่างเข้าใจง่าย พร้อมแผนปรับพฤติกรรม 14 วันสำหรับคนที่หลับยาก ตื่นเหนื่อย หรือใช้หน้าจอก่อนนอนนานเกินไป",
    tags: ["สุขภาพ", "การนอน", "ชีวิตประจำวัน"],
  },
  {
    key: "launch-future-letter",
    title: "จดหมายจากอนาคตที่ยังไม่มาถึง",
    author: "ภูวดล วงโคจร",
    category: "ไซไฟ",
    accessType: "paid",
    price: 139,
    coinPrice: 139,
    ageRating: "13+",
    subtitle: "ไซไฟนุ่มลึกเกี่ยวกับจดหมาย เวลา และการเลือกชีวิตที่ยังเปลี่ยนได้",
    description:
      "ชายหนุ่มได้รับจดหมายจากตัวเองในอีกสิบปีข้างหน้า ทุกฉบับเตือนสิ่งที่เขายังไม่ทำพลาด และทุกคำเตือนกลับทำให้อนาคตยิ่งซับซ้อนขึ้น",
    tags: ["ไซไฟ", "เวลา", "ความสัมพันธ์"],
  },
  {
    key: "launch-mother-kitchen",
    title: "ครัวบ้านแม่กับสูตรที่ไม่เคยเขียน",
    author: "รสสุคนธ์ จันทร์หอม",
    category: "วรรณกรรม",
    accessType: "paid",
    price: 109,
    coinPrice: 109,
    ageRating: "ทั่วไป",
    subtitle: "วรรณกรรมครอบครัวที่มีกลิ่นแกงร้อน ความทรงจำ และการให้อภัย",
    description:
      "ลูกสาวกลับบ้านเพื่อขายร้านอาหารของแม่ แต่สมุดสูตรที่ว่างเปล่ากลับพาเธอไล่ชิมความทรงจำที่เคยหล่นหายไปทีละจาน",
    tags: ["ครอบครัว", "อาหาร", "วรรณกรรม"],
  },
];

const serials = [
  ["launch-midnight-library", "ห้องสมุดหลังเที่ยงคืน", "อัยย์ญาดา เงาจันทร์", "แฟนตาซี", "subscription", 89, "ห้องสมุดที่เปิดหลังเที่ยงคืนและยืมได้แม้กระทั่งความทรงจำ"],
  ["launch-rain-call-case", "สืบคดีเสียงในสายฝน", "ศรุต เมฆา", "สืบสวน", "paid", 99, "สายโทรศัพท์ปริศนาที่ดังเฉพาะตอนฝนตกนำตำรวจหน้าใหม่ไปสู่คดีเก่า"],
  ["launch-time-cafe", "ร้านกาแฟของนักเดินเวลา", "วริศรา นาทีทอง", "ไซไฟ", "subscription", 79, "บาริสต้าที่ชงกาแฟให้ลูกค้าย้อนกลับไปแก้หนึ่งนาทีสำคัญในชีวิต"],
  ["launch-canal-magic-school", "โรงเรียนเวทมนตร์ริมคลอง", "ปุณณวิช คลองดาว", "เด็กและเยาวชน", "free", 0, "เด็กธรรมดาในชุมชนริมน้ำพบว่าเรือรับส่งนักเรียนลำเก่าเป็นประตูสู่โรงเรียนเวทมนตร์"],
  ["launch-memory-repair", "บริษัทรับซ่อมความทรงจำ", "ลักษิกา รีเซ็ต", "ไซไฟ", "paid", 109, "บริษัทเล็ก ๆ รับซ่อมความทรงจำที่แตกร้าว แต่บางความทรงจำไม่อยากถูกซ่อม"],
  ["launch-sleepless-planet", "ดาวเคราะห์ที่ไม่มีใครหลับ", "อคิราห์ วงแหวน", "ไซไฟ", "subscription", 89, "นักบินสำรวจลงจอดบนดาวที่กลางคืนไม่สิ้นสุดและพบเมืองที่ไม่เคยหลับใหล"],
  ["launch-shadow-writer", "นักเขียนเงากับเมืองกระดาษ", "ชลธิชา หมึกดำ", "วรรณกรรม", "paid", 99, "นักเขียนรับจ้างพบว่าตัวละครที่เธอเขียนเริ่มเดินอยู่ในเมืองจริง"],
  ["launch-voice-guardian", "บันทึกผู้พิทักษ์เสียงอ่าน", "ธารินทร์ เสียงใส", "เทคโนโลยี", "free", 0, "อาสาสมัครอ่านหนังสือให้ผู้พิการทางสายตาพบระบบเสียงที่อาจเปลี่ยนอนาคตการอ่าน"],
  ["launch-old-market-files", "แฟ้มลับตลาดเก่า", "มนัสวี ตรอกหอม", "สืบสวน", "paid", 89, "แม่ค้าขายเครื่องเทศเก็บแฟ้มคดีหายากไว้ใต้ร้าน และทุกแฟ้มมีกลิ่นนำทาง"],
  ["launch-last-terminal-love", "รักเล็ก ๆ ที่สถานีปลายทาง", "พิมพ์ชนก ปลายราง", "โรแมนซ์", "paid", 79, "คนสองคนที่พลาดรถไฟขบวนเดียวกันทุกเย็นค่อย ๆ พบว่าปลายทางอาจไม่ใช่สถานที่"],
].map(([key, title, author, category, accessType, price, subtitle]) => ({
  key,
  title,
  author,
  category,
  accessType,
  price,
  coinPrice: price,
  subtitle,
  ageRating: category === "สืบสวน" ? "15+" : "13+",
}));

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hashText(value) {
  return Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function slugify(value) {
  const roman = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return roman || `book-${hashText(value)}`;
}

function splitCoverLines(title) {
  const words = title.split(/\s+/);
  if (words.length <= 2) return words;
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
}

function buildCoverSvg(book, index, typeLabel) {
  const [dark, primary, accent, paper] = coverPalettes[index % coverPalettes.length];
  const titleLines = splitCoverLines(book.title)
    .slice(0, 3)
    .map(
      (line, lineIndex) =>
        `<text x="86" y="${520 + lineIndex * 92}" font-size="70" font-weight="800" fill="${paper}" font-family="Tahoma, Noto Sans Thai, sans-serif">${escapeXml(line)}</text>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="1600" viewBox="0 0 1200 1600" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="1600" fill="${dark}"/>
  <path d="M0 1120C180 980 350 962 520 1040C720 1132 885 1125 1200 900V1600H0V1120Z" fill="${primary}" opacity="0.92"/>
  <circle cx="928" cy="230" r="210" fill="${accent}" opacity="0.28"/>
  <circle cx="990" cy="330" r="88" fill="${paper}" opacity="0.15"/>
  <rect x="64" y="70" width="1072" height="1460" rx="46" stroke="${paper}" stroke-opacity="0.28" stroke-width="3"/>
  <rect x="86" y="120" width="250" height="46" rx="23" fill="${accent}"/>
  <text x="112" y="151" font-size="24" font-weight="800" fill="${dark}" font-family="Tahoma, Noto Sans Thai, sans-serif">${escapeXml(typeLabel)}</text>
  <text x="86" y="250" font-size="32" font-weight="700" fill="${accent}" font-family="Tahoma, Noto Sans Thai, sans-serif">READ AND VOICE</text>
  <text x="86" y="318" font-size="36" font-weight="600" fill="${paper}" opacity="0.76" font-family="Tahoma, Noto Sans Thai, sans-serif">${escapeXml(book.category)}</text>
  ${titleLines}
  <text x="86" y="820" font-size="34" font-weight="600" fill="${paper}" opacity="0.82" font-family="Tahoma, Noto Sans Thai, sans-serif">โดย ${escapeXml(book.author)}</text>
  <rect x="86" y="1030" width="1028" height="310" rx="34" fill="${paper}" opacity="0.12"/>
  <text x="126" y="1100" font-size="34" font-weight="700" fill="${paper}" font-family="Tahoma, Noto Sans Thai, sans-serif">ตัวอย่างพร้อมอ่านและฟัง</text>
  <path d="M132 1192H780" stroke="${paper}" stroke-opacity="0.48" stroke-width="12" stroke-linecap="round"/>
  <path d="M132 1258H970" stroke="${paper}" stroke-opacity="0.28" stroke-width="12" stroke-linecap="round"/>
  <path d="M132 1324H710" stroke="${paper}" stroke-opacity="0.2" stroke-width="12" stroke-linecap="round"/>
  <circle cx="980" cy="1186" r="54" fill="${accent}"/>
  <path d="M965 1158L1004 1186L965 1214V1158Z" fill="${dark}"/>
</svg>`;
}

function ensureCover(book, index, typeLabel) {
  fs.mkdirSync(coverDir, { recursive: true });
  const filename = `${book.key}.svg`;
  fs.writeFileSync(path.join(coverDir, filename), buildCoverSvg(book, index, typeLabel), "utf8");
  return `/uploads/book-covers/${filename}`;
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

async function ensureCategoryMetadataColumns() {
  const metadataColumns = [
    ["parent_id", "parent_id INT NULL AFTER name"],
    ["content_scope", "content_scope VARCHAR(20) NOT NULL DEFAULT 'all' AFTER parent_id"],
    ["display_tone", "display_tone VARCHAR(40) NULL AFTER content_scope"],
    ["display_art", "display_art VARCHAR(40) NULL AFTER display_tone"],
    ["show_on_home", "show_on_home TINYINT(1) NOT NULL DEFAULT 1 AFTER display_art"],
    ["sort_order", "sort_order INT NOT NULL DEFAULT 0 AFTER show_on_home"],
  ];

  for (const [columnName, definition] of metadataColumns) {
    const [columns] = await db.query("SHOW COLUMNS FROM categories LIKE ?", [columnName]);
    if (columns.length === 0) {
      await db.query(`ALTER TABLE categories ADD COLUMN ${definition}`);
    }
  }
}

async function ensureCategories() {
  await ensureCategoryMetadataColumns();

  const categoryIds = new Map();
  for (const [index, name] of categories.entries()) {
    const isSerialCategory = serialBookCategories.includes(name);
    await db.query(
      `INSERT INTO categories (name, content_scope, display_tone, display_art, show_on_home, sort_order)
       VALUES (?, ?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE
         content_scope = VALUES(content_scope),
         display_tone = COALESCE(display_tone, VALUES(display_tone)),
         display_art = COALESCE(display_art, VALUES(display_art)),
         show_on_home = 1,
         sort_order = VALUES(sort_order)`,
      [
        name,
        getCategoryScope(name),
        isSerialCategory ? "serial" : "general",
        isSerialCategory ? `serial-${index + 1}` : `general-${index + 1}`,
        index + 1,
      ],
    );
    const [rows] = await db.query("SELECT id FROM categories WHERE name = ? LIMIT 1", [name]);
    if (rows.length > 0) categoryIds.set(name, rows[0].id);
  }
  return categoryIds;
}

async function getCreatorId() {
  const [adminRows] = await db.query(
    "SELECT id FROM users WHERE role IN ('admin', 'superadmin') ORDER BY id LIMIT 1",
  );
  if (adminRows.length > 0) return adminRows[0].id;

  const [userRows] = await db.query("SELECT id FROM users ORDER BY id LIMIT 1");
  return userRows.length > 0 ? userRows[0].id : null;
}

async function getUserIds() {
  const [rows] = await db.query("SELECT id FROM users ORDER BY id LIMIT 12");
  return rows.map((row) => row.id);
}

function buildEbookPages(book) {
  return [
    `${book.title}\n\n${book.description}\n\nบทนำนี้เปิดด้วยภาพของผู้คนที่กำลังใช้ชีวิตตามปกติ แต่มีบางอย่างเล็ก ๆ เปลี่ยนไปจนตัวละครหลักเริ่มตั้งคำถามกับสิ่งที่เห็นทุกวัน`,
    `ตัวละครของเรื่องเริ่มลงมือค้นหาคำตอบด้วยวิธีของตัวเอง รายละเอียดเล็กน้อย เช่น เสียงที่คุ้นหู สมุดบันทึกเก่า หรือบทสนทนาสั้น ๆ กลายเป็นเบาะแสสำคัญ`,
    `ช่วงกลางเล่มพาไปเห็นความขัดแย้งที่ชัดขึ้น ทุกการตัดสินใจมีผลต่อคนรอบข้าง และหนังสือค่อย ๆ เปิดให้เห็นว่าปัญหาที่แท้จริงไม่ได้อยู่ไกลจากชีวิตประจำวัน`,
    `เมื่อความจริงเริ่มปรากฏ ตัวละครต้องเลือกระหว่างความสบายใจเดิมกับการยอมรับสิ่งใหม่ บทนี้ตั้งใจให้อ่านง่ายและเหมาะกับการฟังแบบต่อเนื่อง`,
    `ตอนท้ายปิดด้วยความหวังที่ไม่ง่ายเกินไป ผู้อ่านจะได้เห็นการเติบโตของตัวละคร พร้อมพื้นที่เล็ก ๆ ให้กลับมาคิดถึงชีวิตของตัวเองหลังอ่านจบ`,
  ];
}

function buildSerialEpisodes(book, count) {
  return Array.from({ length: count }, (_, index) => {
    const episodeNumber = index + 1;
    const accessType =
      episodeNumber <= 2 ? "free" : book.accessType === "free" ? "free" : episodeNumber % 3 === 0 ? "subscription" : book.accessType;
    const isFree = accessType === "free";

    return {
      episodeNumber,
      title: `ตอนที่ ${episodeNumber}: ${[
        "ประตูที่เปิดเอง",
        "ร่องรอยแรก",
        "คนแปลกหน้าที่รู้ชื่อเรา",
        "ความลับใต้แสงไฟ",
        "คืนที่คำตอบมาถึง",
        "ข้อตกลงก่อนรุ่งสาง",
        "เส้นทางที่ย้อนกลับไม่ได้",
        "ปลายทางของเรื่องเล่า",
      ][index]}`,
      content:
        `${book.title}\n\n${book.subtitle}\n\nในตอนที่ ${episodeNumber} เรื่องราวเดินหน้าไปอีกขั้น ตัวละครหลักพบเหตุการณ์ที่ทำให้ต้องทบทวนความเชื่อเดิม และเริ่มเห็นว่าคนรอบตัวต่างมีเหตุผลที่ยังไม่ได้พูดออกมา\n\n` +
        `รายละเอียดของตอนนี้ถูกวางให้เหมือนตอนอ่านจริง มีฉากเปิดที่ชัด บทสนทนาที่พาเรื่องไปข้างหน้า และจุดค้างเล็ก ๆ ให้ผู้อ่านอยากกดอ่านตอนถัดไป\n\n` +
        `ก่อนจบตอน เบาะแสใหม่ปรากฏขึ้นพร้อมคำถามสำคัญว่า สิ่งที่ตัวละครกำลังตามหาเป็นคำตอบ หรือเป็นเพียงจุดเริ่มต้นของเรื่องที่ใหญ่กว่าเดิม`,
      accessType,
      isFree,
      price: isFree ? 0 : Math.max(9, Math.round(book.price / 6)),
    };
  });
}

function addIfColumn(payload, columns, columnName, value) {
  if (columns.has(columnName)) payload[columnName] = value;
}

function buildBookPayload(book, columns, categoryIds, creatorId, coverImage, contentType) {
  const fullText = contentType === "ebook" ? buildEbookPages(book).join("\n\n") : `${book.subtitle}\n\n${book.description || book.subtitle}`;
  const payload = {
    title: book.title,
    author: book.author,
    description: book.description || book.subtitle,
    category_id: categoryIds.get(book.category) || null,
    cover_image: coverImage,
    source_type: sourceType,
    content_type: contentType,
    serial_status: contentType === "serial" ? book.serialStatus || "ongoing" : "completed",
    latest_episode_at: contentType === "serial" ? new Date() : null,
    access_type: book.accessType,
    process_status: "completed",
    full_text: fullText,
    total_pages: contentType === "ebook" ? buildEbookPages(book).length : 1,
    is_published: 1,
    created_by: creatorId,
    price: book.price,
    preview_page_limit: contentType === "ebook" ? 2 : 1,
    preview_char_limit: 1800,
  };

  addIfColumn(payload, columns, "slug", slugify(book.key));
  addIfColumn(payload, columns, "author_name", book.author);
  addIfColumn(payload, columns, "cover_image_url", coverImage);
  addIfColumn(payload, columns, "language_code", "th");
  addIfColumn(payload, columns, "lifecycle_status", "published");
  addIfColumn(payload, columns, "publishing_status", "ready");
  addIfColumn(payload, columns, "coin_price", book.coinPrice);
  addIfColumn(payload, columns, "preview_mode", contentType === "ebook" ? "chapter_count" : "sentence_count");
  addIfColumn(payload, columns, "preview_value", contentType === "ebook" ? 2 : 12);
  addIfColumn(payload, columns, "total_units", contentType === "ebook" ? buildEbookPages(book).length : 0);
  addIfColumn(payload, columns, "age_rating", book.ageRating);
  addIfColumn(payload, columns, "approval_status", "approved");
  addIfColumn(payload, columns, "approval_note", "Seeded launch-ready catalog content.");
  addIfColumn(payload, columns, "is_free_book", book.accessType === "free" ? 1 : 0);
  addIfColumn(payload, columns, "requested_accessibility", "audio");
  addIfColumn(payload, columns, "has_text_content", 1);
  addIfColumn(payload, columns, "has_audio_content", 0);
  addIfColumn(payload, columns, "estimated_reading_minutes", contentType === "ebook" ? 22 : 8);

  return Object.fromEntries(Object.entries(payload).filter(([column]) => columns.has(column)));
}

async function upsertBook(book, columns, categoryIds, creatorId, coverImage, contentType) {
  const payload = buildBookPayload(book, columns, categoryIds, creatorId, coverImage, contentType);
  const entries = Object.entries(payload);
  const columnNames = entries.map(([column]) => column);
  const values = entries.map(([, value]) => value);
  const [existingRows] = await db.query(
    "SELECT id FROM books WHERE source_type = ? AND title = ? LIMIT 1",
    [sourceType, book.title],
  );

  if (existingRows.length > 0) {
    const assignments = columnNames.map((column) => `\`${column}\` = ?`).join(", ");
    await db.query(`UPDATE books SET ${assignments}, updated_at = NOW() WHERE id = ?`, [
      ...values,
      existingRows[0].id,
    ]);
    return existingRows[0].id;
  }

  const placeholders = columnNames.map(() => "?").join(", ");
  const [result] = await db.query(
    `INSERT INTO books (${columnNames.map((column) => `\`${column}\``).join(", ")})
     VALUES (${placeholders})`,
    values,
  );
  return result.insertId;
}

async function replacePages(bookId, pages) {
  await db.query("DELETE FROM book_pages WHERE book_id = ?", [bookId]);
  for (let index = 0; index < pages.length; index += 1) {
    await db.query("INSERT INTO book_pages (book_id, page_number, page_text) VALUES (?, ?, ?)", [
      bookId,
      index + 1,
      pages[index],
    ]);
  }
}

async function replaceEpisodes(bookId, episodes) {
  await db.query("DELETE FROM book_episodes WHERE book_id = ?", [bookId]);
  for (const episode of episodes) {
    await db.query(
      `INSERT INTO book_episodes
       (book_id, episode_number, title, content, price, is_free, access_type, is_published, preview_char_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1500)`,
      [
        bookId,
        episode.episodeNumber,
        episode.title,
        episode.content,
        episode.price,
        episode.isFree ? 1 : 0,
        episode.accessType,
      ],
    );
  }
}

async function seedTags(bookId, tags) {
  try {
    await db.query("DELETE FROM book_tag_maps WHERE book_id = ?", [bookId]);
    for (const tag of tags || []) {
      await db.query("INSERT IGNORE INTO book_tags (name) VALUES (?)", [tag]);
      const [rows] = await db.query("SELECT id FROM book_tags WHERE name = ? LIMIT 1", [tag]);
      if (rows.length > 0) {
        await db.query("INSERT IGNORE INTO book_tag_maps (book_id, tag_id) VALUES (?, ?)", [bookId, rows[0].id]);
      }
    }
  } catch (_) {
    // Older databases may not have tag tables. The catalog seed still remains usable.
  }
}

async function seedViews(bookId, amount, userIds) {
  await db.query("DELETE FROM book_views WHERE book_id = ?", [bookId]);
  const rows = [];
  for (let index = 0; index < amount; index += 1) {
    rows.push([bookId, userIds[index % userIds.length] || null, new Date(Date.now() - index * 3600 * 1000)]);
  }
  if (rows.length > 0) {
    await db.query("INSERT INTO book_views (book_id, user_id, viewed_at) VALUES ?", [rows]);
  }
}

async function seedReviews(bookId, userIds, bookIndex) {
  if (userIds.length === 0) return;
  await db.query("DELETE FROM book_reviews WHERE book_id = ?", [bookId]);
  const comments = [
    "อ่านลื่นมาก เปิดฟังต่อเนื่องแล้วเข้าใจง่าย",
    "ข้อมูลครบกว่าที่คิด ปกสวยและเนื้อหาดูตั้งใจ",
    "เหมาะกับคนที่อยากอ่านสั้น ๆ แต่ยังได้อารมณ์เต็ม",
    "ชอบการเล่าเรื่อง มีจุดให้ติดตามต่อจริง",
  ];
  const reviewCount = Math.min(userIds.length, 4);
  for (let index = 0; index < reviewCount; index += 1) {
    await db.query(
      "INSERT INTO book_reviews (user_id, book_id, rating, comment, created_at) VALUES (?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))",
      [userIds[index], bookId, 4 + ((bookIndex + index) % 2), comments[(bookIndex + index) % comments.length], index + 1],
    );
  }
}

async function main() {
  const bookColumns = await getTableColumns("books");
  const categoryIds = await ensureCategories();
  const creatorId = await getCreatorId();
  const userIds = await getUserIds();
  let ebookCount = 0;
  let serialCount = 0;

  for (let index = 0; index < ebooks.length; index += 1) {
    const book = ebooks[index];
    const coverImage = ensureCover(book, index, "EBOOK");
    const bookId = await upsertBook(book, bookColumns, categoryIds, creatorId, coverImage, "ebook");
    await replacePages(bookId, buildEbookPages(book));
    await replaceEpisodes(bookId, []);
    await seedTags(bookId, book.tags);
    await seedViews(bookId, 18 + index * 3, userIds);
    await seedReviews(bookId, userIds, index);
    ebookCount += 1;
  }

  for (let index = 0; index < serials.length; index += 1) {
    const book = {
      ...serials[index],
      description: `${serials[index].subtitle} วางจังหวะเป็นรายตอน เหมาะกับการอ่านต่อทุกวันและการฟังระหว่างเดินทาง`,
      tags: ["รายตอน", serials[index].category, "อ่านต่อเนื่อง"],
    };
    const coverImage = ensureCover(book, index + ebooks.length, "SERIAL");
    const bookId = await upsertBook(book, bookColumns, categoryIds, creatorId, coverImage, "serial");
    await replacePages(bookId, [`${book.title}\n\n${book.description}\n\nเริ่มอ่านฟรีตอนแรก ๆ แล้วติดตามตอนถัดไปได้ในหน้ารายตอนของหนังสือ`]);
    await replaceEpisodes(bookId, buildSerialEpisodes(book, 6 + (index % 3)));
    await seedTags(bookId, book.tags);
    await seedViews(bookId, 24 + index * 4, userIds);
    await seedReviews(bookId, userIds, index + ebooks.length);
    serialCount += 1;
  }

  const [[summary]] = await db.query(
    `SELECT
       SUM(content_type = 'ebook') AS ebook_count,
       SUM(content_type = 'serial') AS serial_count,
       COUNT(*) AS total_count
     FROM books
     WHERE source_type = ?`,
    [sourceType],
  );

  console.log(`Seeded launch catalog: ${ebookCount} ebooks, ${serialCount} serials.`);
  console.log(
    `Database now has ${summary.total_count} launch books (${summary.ebook_count} ebooks, ${summary.serial_count} serials).`,
  );
  console.log(`Covers written to ${coverDir}`);
}

main()
  .catch((error) => {
    console.error("Launch catalog seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
