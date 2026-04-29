const fs = require("fs");
const path = require("path");

const coverDir = path.join(__dirname, "../uploads/book-covers");
fs.mkdirSync(coverDir, { recursive: true });

const COVER_STYLE_VERSION = "v3";

const themes = {
  mystery: {
    bg: "#090d16",
    bg2: "#233654",
    primary: "#f3efe7",
    accent: "#c89246",
    muted: "#8193ad",
    text: "#f7fbff",
    tag: "นิยายลึกลับ",
  },
  novel: {
    bg: "#17101d",
    bg2: "#4b3040",
    primary: "#fff0d5",
    accent: "#d88a55",
    muted: "#b7a0b0",
    text: "#fff8eb",
    tag: "นิยาย",
  },
  rainCity: {
    bg: "#152235",
    bg2: "#30475f",
    primary: "#dcecff",
    accent: "#72c7d6",
    muted: "#95a7ba",
    text: "#f5fbff",
    tag: "Rain City",
  },
  timeFantasy: {
    bg: "#171323",
    bg2: "#4a365f",
    primary: "#f5e6c8",
    accent: "#d7a94d",
    muted: "#b9a6cf",
    text: "#fff7e8",
    tag: "แฟนตาซีเวลา",
  },
  archive: {
    bg: "#2b2119",
    bg2: "#6b4a2d",
    primary: "#f2ddbd",
    accent: "#b77947",
    muted: "#c6a985",
    text: "#fff4dc",
    tag: "หอจดหมายเหตุ",
  },
  gentle: {
    bg: "#eef7f2",
    bg2: "#cbe7dc",
    primary: "#174f43",
    accent: "#f3ad68",
    muted: "#5c8277",
    text: "#15382f",
    tag: "Mindful",
  },
  business: {
    bg: "#f2f5f8",
    bg2: "#dce6ef",
    primary: "#203a55",
    accent: "#e29057",
    muted: "#607287",
    text: "#17293e",
    tag: "Work",
  },
  tech: {
    bg: "#111a2c",
    bg2: "#173d5f",
    primary: "#e9f7ff",
    accent: "#57d7b2",
    muted: "#82a7bc",
    text: "#f2fbff",
    tag: "Digital",
  },
  language: {
    bg: "#fff4ea",
    bg2: "#f1d4c0",
    primary: "#5a2f46",
    accent: "#2f7d8c",
    muted: "#8a6474",
    text: "#3e2032",
    tag: "Language",
  },
  health: {
    bg: "#f4f8ea",
    bg2: "#dceabb",
    primary: "#365f36",
    accent: "#ef9d63",
    muted: "#718765",
    text: "#263f2b",
    tag: "Wellbeing",
  },
  youth: {
    bg: "#fff3c9",
    bg2: "#f6d889",
    primary: "#2d5b74",
    accent: "#ef6b65",
    muted: "#7f6b44",
    text: "#213f52",
    tag: "Young Readers",
  },
  travel: {
    bg: "#eaf6fb",
    bg2: "#b8dbe8",
    primary: "#214d68",
    accent: "#e99b55",
    muted: "#5d7d8d",
    text: "#17384d",
    tag: "Journey",
  },
  food: {
    bg: "#f7f3e8",
    bg2: "#dce8cc",
    primary: "#31513b",
    accent: "#d96745",
    muted: "#6d7b5d",
    text: "#263c2d",
    tag: "Home Kitchen",
  },
};

const bookColorVariants = [
  { bg: "#09111f", bg2: "#273b63", primary: "#f5ead8", accent: "#d79245", muted: "#8ea4c1", text: "#fff7e8" },
  { bg: "#1b1024", bg2: "#63304a", primary: "#fff0d6", accent: "#e06f5f", muted: "#c59ab7", text: "#fff8ec" },
  { bg: "#10251f", bg2: "#4f6f47", primary: "#f2f2d8", accent: "#e0b95c", muted: "#9fb99b", text: "#fbf7e7" },
  { bg: "#20120f", bg2: "#71412a", primary: "#fff1cf", accent: "#d65d3f", muted: "#c9a28a", text: "#fff6e5" },
  { bg: "#101833", bg2: "#643a7a", primary: "#f2e8ff", accent: "#f0b35a", muted: "#b8a6cf", text: "#fff9f0" },
  { bg: "#061d2a", bg2: "#246875", primary: "#e9fbff", accent: "#f2a65e", muted: "#91c2c9", text: "#f4fdff" },
  { bg: "#2a1624", bg2: "#855064", primary: "#fff1e1", accent: "#f3c35f", muted: "#d4a3b4", text: "#fff8ee" },
  { bg: "#11110f", bg2: "#4b4537", primary: "#f5ecd8", accent: "#b7d36d", muted: "#aaa18e", text: "#fbf7ed" },
  { bg: "#180e13", bg2: "#4e1d29", primary: "#ffe7d6", accent: "#ca8cff", muted: "#b88398", text: "#fff6f0" },
  { bg: "#0d1f17", bg2: "#1f5b52", primary: "#edf9e7", accent: "#e9a33f", muted: "#84aaa0", text: "#f5fff5" },
  { bg: "#23170b", bg2: "#7a5220", primary: "#fff1c8", accent: "#6ed0c2", muted: "#c09b67", text: "#fff7df" },
  { bg: "#0f1728", bg2: "#3c5c87", primary: "#edf5ff", accent: "#ff7b7b", muted: "#9db1ca", text: "#f7fbff" },
];

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createSeed(input = "") {
  return String(input)
    .split("")
    .reduce((total, char, index) => total + char.charCodeAt(0) * (index + 1), 0);
}

function applyBookVariation(theme, seedSource = "") {
  const seed = createSeed(seedSource);
  const colors = bookColorVariants[seed % bookColorVariants.length];

  return {
    ...theme,
    ...colors,
    variant: seed % 6,
    glowX: 780 + (seed % 260),
    glowY: 700 + (seed % 240),
    markX: 560 + (seed % 120),
    markY: 760 + (seed % 140),
  };
}

function pickPalette(seedSource) {
  const keys = Object.keys(themes);
  const seed = createSeed(seedSource);
  return themes[keys[seed % keys.length]];
}

function splitTitleLines(title = "") {
  const cleanTitle = String(title).trim();
  const words = cleanTitle.split(/\s+/).filter(Boolean);
  if (cleanTitle.length <= 14) return [cleanTitle].filter(Boolean);

  if (words.length <= 1) {
    const lines = [];
    for (let index = 0; index < cleanTitle.length; index += 9) {
      lines.push(cleanTitle.slice(index, index + 9));
    }
    return lines.slice(0, 4);
  }

  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > 13 && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 4);
}

function sanitizeFilenamePart(value = "") {
  const ascii = String(value)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  return ascii || "book";
}

function normalizeSearchText(input = {}) {
  return [
    input.title,
    input.subtitle,
    input.author,
    input.category,
    input.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function pickTheme(input = {}) {
  const text = normalizeSearchText(input);

  if (hasAny(text, ["กาลเวลา", "อดีต", "เวลา", "time", "แฟนตาซี", "ความทรงจำ"])) return themes.timeFantasy;
  if (hasAny(text, ["ฝน", "เมือง", "คืน", "ลึกลับ", "ปริศนา", "ระทึก", "เงา", "ทะเลหมอก", "ชายฝั่ง", "คลื่น", "ยุทธจักร", "ชะตา"])) return themes.mystery;
  if (hasAny(text, ["สถานี", "ดอกไม้"])) return themes.rainCity;
  if (hasAny(text, ["หอจดหมายเหตุ", "ห้องสมุด", "เอกสาร", "บันทึก"])) return themes.archive;
  if (hasAny(text, ["เทคโนโลยี", "ดิจิทัล", "โค้ด", "ระบบ", "developer", "คอนเทนต์"])) return themes.tech;
  if (hasAny(text, ["ธุรกิจ", "งาน", "สตาร์ตอัป", "การเงิน", "เงิน", "โปรเจกต์", "ทีม"])) return themes.business;
  if (hasAny(text, ["ภาษา", "พูด", "ออกเสียง", "สื่อสาร"])) return themes.language;
  if (hasAny(text, ["สุขภาพ", "สติ", "ใจ", "ครัว", "อาหาร", "ลดขยะ"])) {
    return hasAny(text, ["ครัว", "อาหาร"]) ? themes.food : themes.health;
  }
  if (hasAny(text, ["เด็ก", "เยาวชน", "นิทาน", "ห้องเรียน", "แสงจันทร์", "ป่า"])) return themes.youth;
  if (hasAny(text, ["เดินทาง", "กระเป๋า", "โลกทั้งใบ", "แม่น้ำ", "บ้าน"])) return themes.travel;
  if (hasAny(text, ["นิยาย", "วรรณกรรม", "เรื่องสั้น", "อบอุ่น", "หัวใจ", "ความรัก", "ชีวิต"])) return themes.novel;

  return pickPalette(text);
}

function renderSymbol(theme, input = {}) {
  const text = normalizeSearchText(input);

  if (hasAny(text, ["กาลเวลา", "เวลา", "อดีต"])) {
    return `
  <circle cx="820" cy="990" r="245" fill="${theme.primary}" fill-opacity="0.07"/>
  <circle cx="820" cy="990" r="205" fill="none" stroke="${theme.primary}" stroke-width="18" stroke-opacity="0.9"/>
  <circle cx="820" cy="990" r="132" fill="none" stroke="${theme.muted}" stroke-width="6" stroke-opacity="0.35"/>
  <circle cx="820" cy="990" r="14" fill="${theme.accent}"/>
  <path d="M820 990L820 855M820 990L930 1055" stroke="${theme.accent}" stroke-width="18" stroke-linecap="round"/>
  <path d="M660 1170C558 1086 548 938 632 835" stroke="${theme.muted}" stroke-width="18" stroke-linecap="round" stroke-opacity="0.62"/>
  <path d="M982 810C1080 894 1088 1044 1006 1152" stroke="${theme.muted}" stroke-width="18" stroke-linecap="round" stroke-opacity="0.62"/>
  <path d="M710 1235C790 1190 894 1190 970 1235" stroke="${theme.accent}" stroke-width="14" stroke-linecap="round" stroke-opacity="0.82"/>`;
  }

  if (hasAny(text, ["ฝน", "เมือง", "สถานี"])) {
    return `
  <path d="M500 1245H1090V892C1002 862 916 868 827 920C748 966 691 1043 614 1072C570 1088 532 1084 500 1068V1245Z" fill="${theme.primary}" fill-opacity="0.12"/>
  <rect x="575" y="852" width="88" height="392" fill="${theme.primary}" fill-opacity="0.88"/>
  <rect x="704" y="772" width="122" height="472" fill="${theme.primary}" fill-opacity="0.72"/>
  <rect x="874" y="900" width="82" height="344" fill="${theme.primary}" fill-opacity="0.58"/>
  <rect x="612" y="914" width="18" height="36" fill="${theme.accent}" fill-opacity="0.6"/>
  <rect x="752" y="840" width="22" height="44" fill="${theme.accent}" fill-opacity="0.56"/>
  <rect x="910" y="964" width="16" height="34" fill="${theme.accent}" fill-opacity="0.52"/>
  <path d="M575 724L1022 724" stroke="${theme.accent}" stroke-width="18" stroke-linecap="round"/>
  <path d="M628 668L968 668" stroke="${theme.primary}" stroke-width="8" stroke-linecap="round" stroke-opacity="0.72"/>
  <path d="M606 760L548 904M738 760L680 904M870 760L812 904M1002 760L944 904" stroke="${theme.muted}" stroke-width="10" stroke-linecap="round" stroke-opacity="0.58"/>
  <path d="M570 1246C724 1164 914 1164 1068 1246" stroke="${theme.accent}" stroke-width="12" stroke-linecap="round" stroke-opacity="0.54"/>`;
  }

  if (hasAny(text, ["ชายฝั่ง", "คลื่น", "ทะเล"])) {
    return `
  <path d="M520 1020C615 958 705 958 800 1020C895 1082 985 1082 1080 1020V1218H520V1020Z" fill="${theme.accent}" fill-opacity="0.84"/>
  <path d="M520 1112C615 1050 705 1050 800 1112C895 1174 985 1174 1080 1112" fill="none" stroke="${theme.primary}" stroke-width="20" stroke-linecap="round" stroke-opacity="0.88"/>
  <circle cx="940" cy="840" r="86" fill="${theme.primary}" fill-opacity="0.18"/>
  <path d="M710 835C760 784 840 775 908 818" stroke="${theme.muted}" stroke-width="18" stroke-linecap="round" stroke-opacity="0.7"/>`;
  }

  if (hasAny(text, ["หอจดหมายเหตุ", "ห้องสมุด", "เอกสาร", "บันทึก", "ความรู้"])) {
    return `
  <rect x="575" y="820" width="470" height="420" rx="18" fill="${theme.primary}" fill-opacity="0.18"/>
  <rect x="625" y="870" width="78" height="320" rx="10" fill="${theme.accent}"/>
  <rect x="723" y="842" width="62" height="348" rx="10" fill="${theme.primary}" fill-opacity="0.82"/>
  <rect x="805" y="895" width="72" height="295" rx="10" fill="${theme.muted}" fill-opacity="0.82"/>
  <rect x="900" y="858" width="58" height="332" rx="10" fill="${theme.primary}" fill-opacity="0.66"/>
  <path d="M600 1220H1030" stroke="${theme.accent}" stroke-width="18" stroke-linecap="round"/>`;
  }

  if (hasAny(text, ["เทคโนโลยี", "ดิจิทัล", "โค้ด", "ระบบ"])) {
    return `
  <rect x="585" y="850" width="460" height="310" rx="28" fill="${theme.primary}" fill-opacity="0.14" stroke="${theme.accent}" stroke-width="8"/>
  <path d="M690 1005L635 960L690 915M938 915L994 960L938 1005" stroke="${theme.accent}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M842 895L790 1025" stroke="${theme.primary}" stroke-width="18" stroke-linecap="round"/>
  <circle cx="640" cy="1230" r="18" fill="${theme.accent}"/><circle cx="815" cy="1230" r="18" fill="${theme.accent}"/><circle cx="990" cy="1230" r="18" fill="${theme.accent}"/>
  <path d="M640 1230H990M815 1160V1230" stroke="${theme.muted}" stroke-width="10" stroke-opacity="0.62"/>`;
  }

  if (hasAny(text, ["ธุรกิจ", "งาน", "เงิน", "การเงิน", "สตาร์ตอัป", "ทีม"])) {
    return `
  <rect x="600" y="980" width="92" height="240" rx="14" fill="${theme.primary}" fill-opacity="0.78"/>
  <rect x="735" y="900" width="92" height="320" rx="14" fill="${theme.accent}" fill-opacity="0.88"/>
  <rect x="870" y="805" width="92" height="415" rx="14" fill="${theme.primary}" fill-opacity="0.9"/>
  <path d="M590 885C695 850 767 812 842 725C880 682 918 660 975 640" stroke="${theme.accent}" stroke-width="20" stroke-linecap="round" fill="none"/>
  <path d="M930 625L985 638L958 690" stroke="${theme.accent}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  }

  if (hasAny(text, ["ภาษา", "พูด", "ออกเสียง", "สื่อสาร"])) {
    return `
  <path d="M610 905C610 820 688 760 795 760C902 760 980 820 980 905C980 990 902 1050 795 1050H710L620 1135L642 1028C622 996 610 955 610 905Z" fill="${theme.primary}" fill-opacity="0.18" stroke="${theme.accent}" stroke-width="12"/>
  <text x="693" y="930" font-size="96" font-weight="800" fill="${theme.primary}" font-family="Tahoma, Noto Sans Thai, sans-serif">ก</text>
  <text x="808" y="930" font-size="96" font-weight="800" fill="${theme.accent}" font-family="Tahoma, Noto Sans Thai, sans-serif">A</text>
  <path d="M620 1220C705 1175 878 1175 980 1220" stroke="${theme.muted}" stroke-width="18" stroke-linecap="round" stroke-opacity="0.62"/>`;
  }

  if (hasAny(text, ["สุขภาพ", "สติ", "ใจ", "ครัว", "อาหาร"])) {
    return `
  <path d="M805 1225C805 1050 760 930 650 842C812 842 964 972 964 1122C964 1184 916 1225 805 1225Z" fill="${theme.primary}" fill-opacity="0.82"/>
  <path d="M790 1218C704 1108 670 990 700 875" stroke="${theme.accent}" stroke-width="18" stroke-linecap="round"/>
  <circle cx="935" cy="820" r="78" fill="${theme.accent}" fill-opacity="0.24"/>
  <path d="M600 1228H1030" stroke="${theme.muted}" stroke-width="16" stroke-linecap="round" stroke-opacity="0.7"/>`;
  }

  if (hasAny(text, ["เด็ก", "เยาวชน", "นิทาน", "ห้องเรียน", "แสงจันทร์", "ป่า"])) {
    return `
  <circle cx="910" cy="770" r="92" fill="${theme.primary}" fill-opacity="0.25"/>
  <path d="M610 1195L720 890L830 1195H610Z" fill="${theme.primary}" fill-opacity="0.82"/>
  <path d="M765 1195L900 825L1040 1195H765Z" fill="${theme.accent}" fill-opacity="0.86"/>
  <path d="M620 1235H1050" stroke="${theme.primary}" stroke-width="18" stroke-linecap="round" stroke-opacity="0.55"/>
  <path d="M665 780L690 815L730 805L705 840L720 880L680 858L645 884L653 842L620 818L662 812Z" fill="${theme.accent}"/>`;
  }

  if (hasAny(text, ["เดินทาง", "กระเป๋า", "โลกทั้งใบ", "แม่น้ำ", "บ้าน"])) {
    return `
  <path d="M560 1110C675 1012 790 1012 905 1110C960 1156 1016 1179 1075 1182V1240H560V1110Z" fill="${theme.accent}" fill-opacity="0.78"/>
  <path d="M620 990C720 900 830 860 1010 820" stroke="${theme.primary}" stroke-width="20" stroke-linecap="round" stroke-dasharray="1 42"/>
  <rect x="630" y="815" width="170" height="230" rx="38" fill="${theme.primary}" fill-opacity="0.82"/>
  <path d="M675 815C680 750 750 750 755 815" stroke="${theme.accent}" stroke-width="16" stroke-linecap="round" fill="none"/>`;
  }

  if (theme === themes.novel) {
    return `
  <path d="M565 1236C620 1068 714 932 842 826C926 756 994 732 1070 728V1236H565Z" fill="${theme.primary}" fill-opacity="0.09"/>
  <circle cx="915" cy="772" r="96" fill="${theme.accent}" fill-opacity="0.42"/>
  <path d="M575 1228C670 1140 760 1092 875 1088C948 1085 1012 1110 1070 1160V1248H575V1228Z" fill="${theme.primary}" fill-opacity="0.2"/>
  <path d="M660 1240C710 1120 782 1018 890 930" stroke="${theme.accent}" stroke-width="18" stroke-linecap="round" stroke-opacity="0.78"/>
  <path d="M632 870C720 818 816 810 924 848" stroke="${theme.primary}" stroke-width="16" stroke-linecap="round" stroke-opacity="0.68"/>
  <path d="M595 1002C700 950 826 944 990 994" stroke="${theme.muted}" stroke-width="12" stroke-linecap="round" stroke-opacity="0.52"/>
  <rect x="690" y="1118" width="210" height="126" rx="16" fill="${theme.bg}" fill-opacity="0.42" stroke="${theme.primary}" stroke-opacity="0.35"/>
  <path d="M718 1150C774 1128 826 1128 882 1150V1212C826 1190 774 1190 718 1212V1150Z" fill="${theme.primary}" fill-opacity="0.72"/>`;
  }

  return `
  <rect x="600" y="820" width="390" height="430" rx="42" fill="${theme.primary}" fill-opacity="0.16"/>
  <path d="M625 1180C750 980 842 980 965 1180" stroke="${theme.accent}" stroke-width="28" stroke-linecap="round" fill="none"/>
  <circle cx="910" cy="855" r="82" fill="${theme.accent}" fill-opacity="0.28"/>`;
}

function renderCoverTexture(theme) {
  const variant = Number(theme.variant || 0);

  if (variant === 0) {
    return `
  <path d="M780 210C930 330 1020 460 1080 620" stroke="${theme.accent}" stroke-width="3" stroke-opacity="0.22" fill="none"/>
  <path d="M735 250C902 390 1012 560 1092 780" stroke="${theme.primary}" stroke-width="2" stroke-opacity="0.14" fill="none"/>
  <circle cx="${theme.glowX}" cy="${theme.glowY}" r="210" fill="${theme.accent}" fill-opacity="0.12"/>`;
  }

  if (variant === 1) {
    return `
  <path d="M760 180L1120 360L1120 520L760 340Z" fill="${theme.accent}" fill-opacity="0.12"/>
  <path d="M690 1220L1120 1040L1120 1270L690 1450Z" fill="${theme.primary}" fill-opacity="0.1"/>
  <circle cx="${theme.glowX}" cy="${theme.glowY}" r="170" fill="${theme.primary}" fill-opacity="0.1"/>`;
  }

  if (variant === 2) {
    return `
  <path d="M740 240C860 220 970 250 1080 330" stroke="${theme.primary}" stroke-width="16" stroke-linecap="round" stroke-opacity="0.12" fill="none"/>
  <path d="M725 310C890 286 1010 340 1115 452" stroke="${theme.accent}" stroke-width="8" stroke-linecap="round" stroke-opacity="0.2" fill="none"/>
  <circle cx="${theme.glowX}" cy="${theme.glowY}" r="190" fill="${theme.accent}" fill-opacity="0.1"/>`;
  }

  if (variant === 3) {
    return `
  <rect x="720" y="205" width="420" height="1120" rx="210" fill="${theme.primary}" fill-opacity="0.06" transform="rotate(14 720 205)"/>
  <rect x="840" y="260" width="240" height="880" rx="120" fill="${theme.accent}" fill-opacity="0.12" transform="rotate(14 840 260)"/>
  <circle cx="${theme.glowX}" cy="${theme.glowY}" r="160" fill="${theme.primary}" fill-opacity="0.12"/>`;
  }

  if (variant === 4) {
    return `
  <path d="M760 250H1110M820 325H1080M880 400H1120" stroke="${theme.primary}" stroke-width="10" stroke-linecap="round" stroke-opacity="0.16"/>
  <path d="M690 1260H1095M745 1330H1050" stroke="${theme.accent}" stroke-width="14" stroke-linecap="round" stroke-opacity="0.18"/>
  <circle cx="${theme.glowX}" cy="${theme.glowY}" r="220" fill="${theme.accent}" fill-opacity="0.08"/>`;
  }

  return `
  <path d="M720 190C880 260 1010 380 1110 550V760C1020 600 890 465 720 360V190Z" fill="${theme.accent}" fill-opacity="0.1"/>
  <path d="M640 1315C805 1210 965 1160 1130 1175V1410C950 1375 780 1405 640 1515V1315Z" fill="${theme.primary}" fill-opacity="0.08"/>
  <circle cx="${theme.glowX}" cy="${theme.glowY}" r="180" fill="${theme.primary}" fill-opacity="0.1"/>`;
}

function buildCoverSvg({ title, subtitle, author, seed }) {
  const theme = applyBookVariation(
    pickTheme({ title, subtitle, author, description: seed, category: seed }),
    `${title || ""}:${subtitle || ""}:${author || ""}:${seed || ""}`,
  );
  const titleLineCount = splitTitleLines(title).length;
  const titleFontSize = titleLineCount >= 4 ? 52 : titleLineCount === 3 ? 56 : 62;
  const titleLines = splitTitleLines(title)
    .map(
      (line, index) =>
        `<text x="96" y="${348 + index * (titleFontSize + 18)}" font-size="${titleFontSize}" font-weight="800" fill="${theme.text}" stroke="${theme.bg}" stroke-width="2" paint-order="stroke" font-family="Tahoma, Noto Sans Thai, sans-serif">${escapeXml(line)}</text>`,
    )
    .join("");
  const subtitleText = subtitle || author || theme.tag;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="1600" viewBox="0 0 1200 1600" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="1600" gradientUnits="userSpaceOnUse">
      <stop stop-color="${theme.bg}"/>
      <stop offset="1" stop-color="${theme.bg2}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="28" flood-color="#000000" flood-opacity="0.24"/>
    </filter>
  </defs>
  <rect width="1200" height="1600" fill="url(#bg)"/>
  <rect x="64" y="64" width="1072" height="1472" rx="50" fill="#ffffff" fill-opacity="0.055" stroke="${theme.primary}" stroke-opacity="0.22" stroke-width="4"/>
  ${renderCoverTexture(theme)}
  <circle cx="1015" cy="214" r="205" fill="${theme.accent}" fill-opacity="0.12"/>
  <circle cx="180" cy="1260" r="190" fill="${theme.primary}" fill-opacity="0.12"/>
  <path d="M96 190H390" stroke="${theme.accent}" stroke-width="18" stroke-linecap="round"/>
  <path d="M96 232H285" stroke="${theme.primary}" stroke-width="10" stroke-linecap="round" stroke-opacity="0.55"/>
  <path d="M96 292H520" stroke="${theme.bg}" stroke-width="84" stroke-linecap="round" stroke-opacity="0.18"/>
  <g filter="url(#shadow)">
${renderSymbol(theme, { title, subtitle, author, description: seed, category: seed })}
  </g>
  ${titleLines}
  <text x="96" y="665" font-size="28" font-weight="600" fill="${theme.text}" fill-opacity="0.78" font-family="Tahoma, Noto Sans Thai, sans-serif">${escapeXml(subtitleText).slice(0, 92)}</text>
  <path d="M96 1290H470" stroke="${theme.accent}" stroke-width="8" stroke-linecap="round" stroke-opacity="0.78"/>
  <text x="96" y="1342" font-size="30" font-weight="800" fill="${theme.text}" font-family="Tahoma, Noto Sans Thai, sans-serif">${escapeXml(author || "Read and Voice")}</text>
  <text x="96" y="1400" font-size="22" font-weight="700" fill="${theme.text}" fill-opacity="0.64" font-family="Tahoma, Noto Sans Thai, sans-serif">${escapeXml(theme.tag)}</text>
</svg>`;
}

function isMissingCover(value) {
  return !String(value || "").trim();
}

function getCoverImagePath(file, fallback = "") {
  if (!file) return fallback;
  return `uploads/book-covers/${file.filename}`;
}

function generateBookCoverPath({ bookId, title, subtitle, author, seed, force = false }) {
  const filename = `${bookId || "draft"}-${sanitizeFilenamePart(title)}-${COVER_STYLE_VERSION}.svg`;
  const filePath = path.join(coverDir, filename);

  if (force || !fs.existsSync(filePath)) {
    const svg = buildCoverSvg({
      title: title || "Untitled Book",
      subtitle,
      author,
      seed: seed || `${bookId || "draft"}:${title || ""}:${author || ""}`,
    });
    fs.writeFileSync(filePath, svg, "utf8");
  }

  return `uploads/book-covers/${filename}`;
}

async function ensureBookCover(book, connection, options = {}) {
  const currentCover = String(book?.cover_image || book?.cover_image_url || "").trim();
  if (currentCover && !options.force) return currentCover;

  const generatedCover = generateBookCoverPath({
    bookId: book?.id,
    title: book?.title,
    subtitle: book?.subtitle,
    author: book?.author_name || book?.author,
    seed: `${book?.category_name || ""}:${book?.description || ""}`,
    force: Boolean(options.force),
  });

  if (book?.id && connection?.query) {
    await connection.query(
      `UPDATE books
       SET cover_image = ?,
           cover_image_url = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [generatedCover, generatedCover, book.id],
    );
  }

  book.cover_image = generatedCover;
  book.cover_image_url = book.cover_image_url || generatedCover;
  return generatedCover;
}

async function ensureBooksHaveCovers(books, connection, options = {}) {
  for (const book of Array.isArray(books) ? books : []) {
    await ensureBookCover(book, connection, options);
  }

  return books;
}

module.exports = {
  ensureBookCover,
  ensureBooksHaveCovers,
  generateBookCoverPath,
  getCoverImagePath,
  isMissingCover,
};
