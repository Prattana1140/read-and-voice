require("dotenv").config({ quiet: true });

const fs = require("fs");
const path = require("path");

if (!process.env.ENABLE_OCR && !process.env.ENABLE_PDF_OCR) {
  process.env.ENABLE_OCR = "true";
}
process.env.OCR_LANG = process.env.OCR_LANG || "tha";
process.env.OCR_PSM = process.env.OCR_PSM || "11";
process.env.OCR_RENDER_DPI = process.env.OCR_RENDER_DPI || "300";
process.env.OCR_CONCURRENCY = process.env.OCR_CONCURRENCY || "3";
process.env.IMPORT_FIRST_PAGE = process.env.IMPORT_FIRST_PAGE || "2";

const db = require("../../config/db");
const { generateBookCoverPath } = require("../bookCover");
const { cleanOcrText, cleanThaiOcrPage } = require("../fileParser");
const { runPdfOCR } = require("../ocrService");

const sourcePdf = process.env.IMPORT_PDF_PATH || process.argv[2];
const title =
  process.env.BOOK_TITLE ||
  (sourcePdf ? path.basename(sourcePdf, path.extname(sourcePdf)) : "");
const author = process.env.BOOK_AUTHOR || "Mao Ni";
const categoryName = process.env.BOOK_CATEGORY || "แฟนตาซี";
const description =
  process.env.BOOK_DESCRIPTION ||
  `นำเข้าจากไฟล์ PDF "${title}" พร้อมแปลง OCR เป็นข้อความสำหรับอ่านในระบบ Read and Voice`;
const accessType = process.env.BOOK_ACCESS_TYPE || "free";
const price = Number(process.env.BOOK_PRICE || 0);
const subtitle = process.env.BOOK_SUBTITLE || "";
const importFirstPage = Math.max(1, Number(process.env.IMPORT_FIRST_PAGE || 1));
const importLastPage = Math.max(0, Number(process.env.IMPORT_LAST_PAGE || 0));

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\s-\u0E00-\u0E7F]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function addIfColumn(payload, columns, columnName, value) {
  if (columns.has(columnName)) payload[columnName] = value;
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

function buildPayload({ columns, categoryId, creatorId, coverImage, content }) {
  const estimatedWords = content.fullText.split(/\s+/).filter(Boolean).length;
  const payload = {
    title,
    author,
    description,
    category_id: categoryId,
    cover_image: coverImage,
    source_type: "local_pdf",
    content_type: "ebook",
    access_type: accessType,
    process_status: "completed",
    full_text: content.fullText,
    total_pages: content.pages.length,
    is_published: 1,
    created_by: creatorId,
    price,
    preview_page_limit: Math.min(content.pages.length || 1, 2),
    preview_char_limit: 1800,
  };

  addIfColumn(payload, columns, "slug", slugify(title));
  addIfColumn(payload, columns, "subtitle", subtitle);
  addIfColumn(payload, columns, "author_name", author);
  addIfColumn(payload, columns, "cover_image_url", coverImage);
  addIfColumn(payload, columns, "language_code", "th");
  addIfColumn(payload, columns, "lifecycle_status", "published");
  addIfColumn(payload, columns, "publishing_status", "ready");
  addIfColumn(payload, columns, "coin_price", price);
  addIfColumn(payload, columns, "preview_mode", "chapter_count");
  addIfColumn(payload, columns, "preview_value", Math.min(content.pages.length || 1, 2));
  addIfColumn(payload, columns, "total_units", content.pages.length);
  addIfColumn(payload, columns, "total_words", estimatedWords);
  addIfColumn(payload, columns, "total_characters", content.fullText.length);
  addIfColumn(payload, columns, "estimated_reading_minutes", Math.max(1, Math.ceil(estimatedWords / 180)));
  addIfColumn(payload, columns, "approval_status", "approved");
  addIfColumn(payload, columns, "approval_note", "Imported from local PDF with OCR.");
  addIfColumn(payload, columns, "is_free_book", accessType === "free" || price <= 0 ? 1 : 0);
  addIfColumn(payload, columns, "has_text_content", 1);
  addIfColumn(payload, columns, "has_audio_content", 0);

  return Object.fromEntries(Object.entries(payload).filter(([column]) => columns.has(column)));
}

async function upsertBook(content, categoryId, creatorId, columns) {
  const [existingRows] = await db.query(
    "SELECT id FROM books WHERE source_type = ? AND title = ? LIMIT 1",
    ["local_pdf", title],
  );
  const existingId = existingRows[0]?.id || null;
  const draftCover = generateBookCoverPath({
    bookId: existingId || "draft",
    title,
    subtitle,
    author,
    seed: `${categoryName}:${description}`,
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
    title,
    subtitle,
    author,
    seed: `${categoryName}:${description}`,
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

function copySourcePdf() {
  const uploadDir = path.join(__dirname, "../../uploads/book-files");
  const suffix = Date.now().toString(36);
  const storedFilename = `${slugify(title) || "local-pdf"}-${suffix}.pdf`;
  const storedPath = path.join(uploadDir, storedFilename);

  fs.mkdirSync(uploadDir, { recursive: true });
  fs.copyFileSync(sourcePdf, storedPath);
  return { storedFilename, storedPath };
}

async function upsertBookFile(bookId, storedFile) {
  const [oldFiles] = await db.query("SELECT id, file_path FROM book_files WHERE book_id = ?", [bookId]);
  await db.query("DELETE FROM book_files WHERE book_id = ?", [bookId]);

  for (const oldFile of oldFiles) {
    const oldPath = path.resolve(String(oldFile.file_path || ""));
    const uploadRoot = path.resolve(__dirname, "../../uploads/book-files");
    if (oldPath.startsWith(uploadRoot) && oldPath !== storedFile.storedPath) {
      try {
        fs.unlinkSync(oldPath);
      } catch (_) {
        // Best effort cleanup only.
      }
    }
  }

  await db.query(
    `INSERT INTO book_files
     (book_id, original_filename, stored_filename, file_path, file_ext, mime_type, file_size, is_primary, uploaded_at)
     VALUES (?, ?, ?, ?, '.pdf', 'application/pdf', ?, 1, NOW())`,
    [
      bookId,
      path.basename(sourcePdf),
      storedFile.storedFilename,
      storedFile.storedPath.replace(/\\/g, "/"),
      fs.statSync(storedFile.storedPath).size,
    ],
  );
}

async function main() {
  console.log("Import step: validate input");
  if (!sourcePdf) {
    throw new Error("Set IMPORT_PDF_PATH or pass the PDF path as the first argument.");
  }
  if (!fs.existsSync(sourcePdf)) {
    throw new Error(`PDF file not found: ${sourcePdf}`);
  }
  if (!title) {
    throw new Error("BOOK_TITLE could not be resolved.");
  }

  console.log("Import step: copy source PDF");
  const storedFile = copySourcePdf();
  console.log(`Import step: OCR ${storedFile.storedPath}`);
  const rawContent = await runPdfOCR(storedFile.storedPath);
  console.log("Import step: clean OCR text");
  const rawPages = Array.isArray(rawContent.pages) ? rawContent.pages : [];
  const selectedPages = rawPages.slice(
    importFirstPage - 1,
    importLastPage > 0 ? importLastPage : undefined,
  );
  const pages = selectedPages
    .map((page, index) => cleanThaiOcrPage(page, importFirstPage + index))
    .filter(Boolean);
  const fullText = cleanOcrText(pages.join("\n\n"));

  if (!fullText || pages.length === 0) {
    throw new Error("OCR did not produce readable text from this PDF.");
  }

  const content = { fullText, pages };
  console.log("Import step: load database metadata");
  const columns = await getTableColumns("books");
  const categoryId = await ensureCategory(categoryName);
  const creatorId = await getCreatorId();
  console.log("Import step: upsert book");
  const { bookId, coverImage } = await upsertBook(content, categoryId, creatorId, columns);

  console.log("Import step: save pages and source file");
  await replaceBookPages(bookId, pages);
  await upsertBookFile(bookId, storedFile);

  console.log(
    JSON.stringify({
      bookId,
      title,
      author,
      category: categoryName,
      accessType,
      importedPages: pages.length,
      textLength: fullText.length,
      storedPdf: storedFile.storedPath,
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
