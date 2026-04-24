const fs = require("fs");
const path = require("path");

const coverDir = path.join(__dirname, "../uploads/book-covers");
fs.mkdirSync(coverDir, { recursive: true });

const palettes = [
  { bg: "#f4efe7", primary: "#224f66", accent: "#f08c6c", text: "#123043" },
  { bg: "#f7f2ea", primary: "#5b3f8c", accent: "#d99f5d", text: "#2d1b4f" },
  { bg: "#eef6f2", primary: "#145b52", accent: "#f4b860", text: "#12332f" },
  { bg: "#f4f1fb", primary: "#7c3f58", accent: "#f0bf6b", text: "#351b2c" },
  { bg: "#eef3fb", primary: "#234b8f", accent: "#72c6a1", text: "#12284d" },
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

function pickPalette(seedSource) {
  const seed = createSeed(seedSource);
  return palettes[seed % palettes.length];
}

function splitTitleLines(title = "") {
  const words = String(title).trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) return [title].filter(Boolean);

  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > 16 && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 3);
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

function buildCoverSvg({ title, subtitle, author, seed }) {
  const palette = pickPalette(seed);
  const titleLines = splitTitleLines(title)
    .map(
      (line, index) =>
        `<text x="100" y="${420 + index * 88}" font-size="68" font-weight="800" fill="${palette.text}" font-family="Tahoma, Noto Sans Thai, sans-serif">${escapeXml(line)}</text>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="1600" viewBox="0 0 1200 1600" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="1600" fill="${palette.bg}"/>
  <rect x="72" y="72" width="1056" height="1456" rx="52" fill="${palette.primary}" fill-opacity="0.08" stroke="${palette.primary}" stroke-opacity="0.18" stroke-width="4"/>
  <circle cx="965" cy="220" r="190" fill="${palette.accent}" fill-opacity="0.18"/>
  <circle cx="238" cy="1210" r="145" fill="${palette.accent}" fill-opacity="0.22"/>
  <rect x="100" y="170" width="280" height="16" rx="8" fill="${palette.primary}"/>
  <rect x="100" y="210" width="180" height="10" rx="5" fill="${palette.primary}" fill-opacity="0.45"/>
  <rect x="100" y="910" width="1000" height="360" rx="42" fill="${palette.primary}"/>
  <path d="M540 1045C690 910 818 874 962 896C1016 904 1062 918 1100 938V1270H540V1045Z" fill="${palette.accent}" fill-opacity="0.92"/>
  ${titleLines}
  <text x="100" y="690" font-size="28" font-weight="500" fill="${palette.text}" fill-opacity="0.72" font-family="Tahoma, Noto Sans Thai, sans-serif">${escapeXml(subtitle || author || "Read and Voice")}</text>
  <text x="100" y="1340" font-size="30" font-weight="700" fill="${palette.bg}" font-family="Tahoma, Noto Sans Thai, sans-serif">${escapeXml(author || "Read and Voice")}</text>
  <text x="100" y="1400" font-size="22" font-weight="500" fill="${palette.bg}" fill-opacity="0.76" font-family="Tahoma, Noto Sans Thai, sans-serif">${escapeXml(subtitle || "Auto generated cover")}</text>
</svg>`;
}

function isMissingCover(value) {
  return !String(value || "").trim();
}

function getCoverImagePath(file, fallback = "") {
  if (!file) return fallback;
  return `uploads/book-covers/${file.filename}`;
}

function generateBookCoverPath({ bookId, title, subtitle, author, seed }) {
  const filename = `${bookId || "draft"}-${sanitizeFilenamePart(title)}.svg`;
  const filePath = path.join(coverDir, filename);

  if (!fs.existsSync(filePath)) {
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

async function ensureBookCover(book, connection) {
  const currentCover = String(book?.cover_image || book?.cover_image_url || "").trim();
  if (currentCover) return currentCover;

  const generatedCover = generateBookCoverPath({
    bookId: book?.id,
    title: book?.title,
    subtitle: book?.subtitle,
    author: book?.author_name || book?.author,
  });

  if (book?.id && connection?.query) {
    await connection.query(
      `UPDATE books
       SET cover_image = COALESCE(NULLIF(TRIM(cover_image), ''), ?),
           cover_image_url = COALESCE(NULLIF(TRIM(cover_image_url), ''), ?),
           updated_at = NOW()
       WHERE id = ?`,
      [generatedCover, generatedCover, book.id],
    );
  }

  book.cover_image = generatedCover;
  book.cover_image_url = book.cover_image_url || generatedCover;
  return generatedCover;
}

async function ensureBooksHaveCovers(books, connection) {
  for (const book of Array.isArray(books) ? books : []) {
    await ensureBookCover(book, connection);
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
