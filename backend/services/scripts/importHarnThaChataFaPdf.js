const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const db = require("../../config/db");
const { sanitizeBookText } = require("../fileParser");
const { generateBookCoverPath } = require("../bookCover");

const sourcePdf =
  process.env.IMPORT_PDF_PATH ||
  "C:\\Users\\jikke\\OneDrive\\Desktop\\นิยาย\\หาญท้าชะตาฟ้า\\หาญท้าชะตาฟ้า ภาค 1 เล่ม 12.pdf";
const storedFilename = "harn-tha-chata-fa-v1-12.pdf";
const storedPdfPath = path.join(__dirname, "../../uploads/source-books", storedFilename);
const tempDir = path.join(__dirname, "../../uploads/ocr-temp/harn-v1-12");
const ghostscriptCommand =
  process.env.GHOSTSCRIPT_COMMAND || "C:\\Program Files\\gs\\gs10.07.0\\bin\\gswin64c.exe";
const tesseractCommand =
  process.env.TESSERACT_COMMAND ||
  (process.platform === "win32" ? "C:\\Program Files\\Tesseract-OCR\\tesseract.exe" : "tesseract");
const ocrLang = process.env.OCR_LANG || "tha+eng";
const renderDpi = String(process.env.IMPORT_RENDER_DPI || "170");
const firstPage = Math.max(1, Number(process.env.IMPORT_FIRST_PAGE || 1));
const maxPages = Number(process.env.IMPORT_MAX_PAGES || 0);

const bookMeta = {
  title: "หาญท้าชะตาฟ้า ภาค 1 เล่ม 12",
  subtitle: "เล่ม 12 จากชุดหาญท้าชะตาฟ้า",
  author: "Mao Ni",
  description:
    "นิยายกำลังภายใน/แฟนตาซีจีน เล่มต่อเนื่องในชุดหาญท้าชะตาฟ้า นำเข้าจากไฟล์ PDF ส่วนตัว พร้อมแปลงเป็นหน้าอ่านในระบบ Read and Voice",
  category: "แฟนตาซี",
  sourceType: "local_pdf",
  accessType: "paid",
  price: 120,
  coinPrice: 120,
  ageRating: "15+",
};

function execFileLoose(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: "utf8", windowsHide: true, ...options }, (error, stdout, stderr) => {
      const result = {
        stdout: String(stdout || ""),
        stderr: String(stderr || ""),
        error,
      };

      if (error && !result.stdout.trim()) {
        error.stderr = result.stderr;
        return reject(error);
      }

      return resolve(result);
    });
  });
}

async function getPdfPageCount(filePath) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  try {
    return pdf.numPages;
  } finally {
    await pdf.destroy();
  }
}

async function renderPageToImage(pdfPath, pageNumber) {
  fs.mkdirSync(tempDir, { recursive: true });
  const imagePath = path.join(tempDir, `page-${String(pageNumber).padStart(4, "0")}.png`);

  await execFileLoose(
    ghostscriptCommand,
    [
      "-dSAFER",
      "-dBATCH",
      "-dNOPAUSE",
      "-sDEVICE=pnggray",
      `-r${renderDpi}`,
      `-dFirstPage=${pageNumber}`,
      `-dLastPage=${pageNumber}`,
      `-sOutputFile=${imagePath}`,
      pdfPath,
    ],
    { timeout: 120000, maxBuffer: 10 * 1024 * 1024 },
  );

  return imagePath;
}

async function ocrImage(imagePath) {
  const { stdout } = await execFileLoose(
    tesseractCommand,
    [imagePath, "stdout", "-l", ocrLang, "--psm", "6"],
    { timeout: 120000, maxBuffer: 25 * 1024 * 1024 },
  );

  return sanitizeBookText(stdout);
}

async function extractPagesWithOcr(pdfPath) {
  const totalPages = await getPdfPageCount(pdfPath);
  const lastPage = maxPages > 0 ? Math.min(totalPages, firstPage + maxPages - 1) : totalPages;
  const pages = [];

  for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) {
    const imagePath = await renderPageToImage(pdfPath, pageNumber);
    const text = await ocrImage(imagePath);
    const cleaned = sanitizeBookText(text);

    if (cleaned) {
      pages.push(cleaned);
    }

    try {
      fs.unlinkSync(imagePath);
    } catch (_) {
      // Best effort cleanup only.
    }

    console.log(`OCR imported page ${pageNumber}/${lastPage} (${cleaned.length} chars)`);
  }

  if (pages.length === 0) {
    throw new Error("OCR did not produce readable text from this PDF.");
  }

  return {
    sourcePageCount: totalPages,
    pages,
    fullText: sanitizeBookText(pages.join("\n\n")),
  };
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

async function ensureCategory(name) {
  await db.query("INSERT IGNORE INTO categories (name) VALUES (?)", [name]);
  const [rows] = await db.query("SELECT id FROM categories WHERE name = ? LIMIT 1", [name]);
  return rows[0]?.id || null;
}

async function getCreatorId() {
  const [adminRows] = await db.query(
    "SELECT id FROM users WHERE role IN ('admin', 'superadmin') ORDER BY id LIMIT 1",
  );
  if (adminRows.length > 0) return adminRows[0].id;

  const [userRows] = await db.query("SELECT id FROM users ORDER BY id LIMIT 1");
  return userRows[0]?.id || null;
}

function addIfColumn(payload, columns, columnName, value) {
  if (columns.has(columnName)) payload[columnName] = value;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\s-\u0E00-\u0E7F]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function buildPayload({ columns, categoryId, creatorId, coverImage, content }) {
  const estimatedWords = content.fullText.split(/\s+/).filter(Boolean).length;
  const payload = {
    title: bookMeta.title,
    author: bookMeta.author,
    description: bookMeta.description,
    category_id: categoryId,
    cover_image: coverImage,
    source_type: bookMeta.sourceType,
    content_type: "ebook",
    access_type: bookMeta.accessType,
    process_status: "completed",
    full_text: content.fullText,
    total_pages: content.pages.length,
    is_published: 1,
    created_by: creatorId,
    price: bookMeta.price,
    preview_page_limit: 2,
    preview_char_limit: 1800,
  };

  addIfColumn(payload, columns, "slug", slugify(bookMeta.title));
  addIfColumn(payload, columns, "subtitle", bookMeta.subtitle);
  addIfColumn(payload, columns, "author_name", bookMeta.author);
  addIfColumn(payload, columns, "cover_image_url", coverImage);
  addIfColumn(payload, columns, "language_code", "th");
  addIfColumn(payload, columns, "lifecycle_status", "published");
  addIfColumn(payload, columns, "publishing_status", "ready");
  addIfColumn(payload, columns, "coin_price", bookMeta.coinPrice);
  addIfColumn(payload, columns, "preview_mode", "chapter_count");
  addIfColumn(payload, columns, "preview_value", 2);
  addIfColumn(payload, columns, "total_units", content.pages.length);
  addIfColumn(payload, columns, "total_words", estimatedWords);
  addIfColumn(payload, columns, "total_characters", content.fullText.length);
  addIfColumn(payload, columns, "estimated_reading_minutes", Math.max(1, Math.ceil(estimatedWords / 180)));
  addIfColumn(payload, columns, "age_rating", bookMeta.ageRating);
  addIfColumn(payload, columns, "approval_status", "approved");
  addIfColumn(payload, columns, "approval_note", "Imported from local PDF with OCR.");
  addIfColumn(payload, columns, "is_free_book", 0);
  addIfColumn(payload, columns, "has_text_content", 1);
  addIfColumn(payload, columns, "has_audio_content", 0);

  return Object.fromEntries(Object.entries(payload).filter(([column]) => columns.has(column)));
}

async function upsertBook(content, categoryId, creatorId, columns) {
  const [existingRows] = await db.query(
    "SELECT id FROM books WHERE source_type = ? AND title = ? LIMIT 1",
    [bookMeta.sourceType, bookMeta.title],
  );
  const existingId = existingRows[0]?.id || null;
  const draftCover = generateBookCoverPath({
    bookId: existingId || "draft",
    title: bookMeta.title,
    subtitle: bookMeta.subtitle,
    author: bookMeta.author,
    seed: `${bookMeta.category}:${bookMeta.description}`,
    force: true,
  });
  const payload = buildPayload({
    columns,
    categoryId,
    creatorId,
    coverImage: draftCover,
    content,
  });
  const entries = Object.entries(payload);
  const columnNames = entries.map(([column]) => column);
  const values = entries.map(([, value]) => value);

  let bookId = existingId;
  if (bookId) {
    await db.query(
      `UPDATE books
       SET ${columnNames.map((column) => `\`${column}\` = ?`).join(", ")},
           updated_at = NOW()
       WHERE id = ?`,
      [...values, bookId],
    );
  } else {
    const placeholders = columnNames.map(() => "?").join(", ");
    const [result] = await db.query(
      `INSERT INTO books (${columnNames.map((column) => `\`${column}\``).join(", ")})
       VALUES (${placeholders})`,
      values,
    );
    bookId = result.insertId;
  }

  const finalCover = generateBookCoverPath({
    bookId,
    title: bookMeta.title,
    subtitle: bookMeta.subtitle,
    author: bookMeta.author,
    seed: `${bookMeta.category}:${bookMeta.description}`,
    force: true,
  });
  await db.query(
    "UPDATE books SET cover_image = ?, cover_image_url = ?, updated_at = NOW() WHERE id = ?",
    [finalCover, finalCover, bookId],
  );

  return { bookId, coverImage: finalCover };
}

async function replaceBookPages(bookId, pages) {
  await db.query("DELETE FROM book_pages WHERE book_id = ?", [bookId]);
  for (let index = 0; index < pages.length; index += 1) {
    await db.query(
      "INSERT INTO book_pages (book_id, page_number, page_text) VALUES (?, ?, ?)",
      [bookId, index + 1, pages[index]],
    );
  }
}

async function upsertBookFile(bookId) {
  await db.query("UPDATE book_files SET is_primary = 0 WHERE book_id = ?", [bookId]);
  await db.query(
    `INSERT INTO book_files
     (book_id, original_filename, stored_filename, file_path, file_ext, mime_type, file_size, is_primary, uploaded_at)
     VALUES (?, ?, ?, ?, '.pdf', 'application/pdf', ?, 1, NOW())`,
    [
      bookId,
      "หาญท้าชะตาฟ้า ภาค 1 เล่ม 12.pdf",
      storedFilename,
      `uploads/source-books/${storedFilename}`,
      fs.statSync(storedPdfPath).size,
    ],
  );
}

async function main() {
  if (!fs.existsSync(sourcePdf)) {
    throw new Error(`PDF file not found: ${sourcePdf}`);
  }

  fs.mkdirSync(path.dirname(storedPdfPath), { recursive: true });
  fs.copyFileSync(sourcePdf, storedPdfPath);

  const content = await extractPagesWithOcr(storedPdfPath);
  const columns = await getTableColumns("books");
  const categoryId = await ensureCategory(bookMeta.category);
  const creatorId = await getCreatorId();
  const { bookId, coverImage } = await upsertBook(content, categoryId, creatorId, columns);

  await replaceBookPages(bookId, content.pages);
  await upsertBookFile(bookId);

  console.log(
    JSON.stringify({
      bookId,
      title: bookMeta.title,
      sourcePageCount: content.sourcePageCount,
      importedPages: content.pages.length,
      textLength: content.fullText.length,
      coverImage,
    }),
  );
}

main()
  .catch((error) => {
    console.error("Import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
