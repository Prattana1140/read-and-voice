require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env"), quiet: true });

const db = require("../../config/db");
const { sanitizeBookText } = require("../fileParser");
const {
  buildBlocksFromRawText,
  prepareStructuredContent,
  slugify,
} = require("../contentSegmenter");

const applyChanges = process.argv.includes("--apply");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Math.max(1, Number(limitArg.split("=")[1] || 0)) : 0;
const bookIdArg = process.argv.find((arg) => arg.startsWith("--book-id="));
const bookIdFilter = bookIdArg ? Math.max(1, Number(bookIdArg.split("=")[1] || 0)) : 0;
const blockCharsArg = process.argv.find((arg) => arg.startsWith("--block-chars="));
const blockCharLimit = blockCharsArg
  ? Math.max(800, Number(blockCharsArg.split("=")[1] || 0))
  : 2400;

function splitLongText(text, maxChars = blockCharLimit) {
  const value = String(text || "").trim();
  if (!value) return [];
  if (value.length <= maxChars) return [value];

  const chunks = [];
  let remaining = value;

  while (remaining.length > maxChars) {
    const window = remaining.slice(0, maxChars);
    const splitAt = Math.max(
      window.lastIndexOf("\n"),
      window.lastIndexOf(". "),
      window.lastIndexOf("! "),
      window.lastIndexOf("? "),
      window.lastIndexOf(" "),
    );
    const safeSplit = splitAt >= Math.floor(maxChars * 0.5) ? splitAt + 1 : maxChars;
    chunks.push(remaining.slice(0, safeSplit).trim());
    remaining = remaining.slice(safeSplit).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

function buildMigrationBlocks(rawText) {
  const originalBlocks = buildBlocksFromRawText(rawText, "paragraph");
  const migrationBlocks = [];

  for (const block of originalBlocks) {
    const parts = splitLongText(block.display_text);
    for (const part of parts) {
      migrationBlocks.push({
        block_order: migrationBlocks.length + 1,
        block_type: block.block_type,
        display_text: part,
      });
    }
  }

  return migrationBlocks;
}

async function getLegacyText(bookId, fullText) {
  const cleanFullText = sanitizeBookText(fullText || "");
  if (cleanFullText) return cleanFullText;

  const [pages] = await db.query(
    `SELECT page_text
     FROM book_pages
     WHERE book_id = ?
     ORDER BY page_number ASC`,
    [bookId],
  );

  return sanitizeBookText(
    pages.map((page) => page.page_text || "").filter(Boolean).join("\n\n"),
  );
}

async function hasStructuredContent(bookId, connection = db) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM book_units
     WHERE book_id = ?`,
    [bookId],
  );
  return Number(rows[0]?.total || 0) > 0;
}

async function insertStructuredContent(connection, book, rawText) {
  const [unitResult] = await connection.query(
    `INSERT INTO book_units
     (book_id, unit_type, unit_number, slug, title, access_type, is_preview, lifecycle_status, published_at, created_at, updated_at)
     VALUES (?, ?, 1, ?, ?, 'inherit', 0, ?, ?, NOW(), NOW())`,
    [
      book.id,
      book.content_type === "serial" ? "episode" : "chapter",
      slugify(`${book.id}-${book.title}`, `legacy-${book.id}`),
      book.content_type === "serial" ? "ตอนหลัก" : "เนื้อหาหลัก",
      book.lifecycle_status === "published" ? "published" : "draft",
      book.lifecycle_status === "published" ? new Date() : null,
    ],
  );

  const unitId = unitResult.insertId;
  const blocks = buildMigrationBlocks(rawText);
  const structured = prepareStructuredContent({
    bookId: book.id,
    unitId,
    blocks,
  });

  for (const block of structured.blocks) {
    const [blockResult] = await connection.query(
      `INSERT INTO book_unit_blocks
       (book_unit_id, block_order, block_type, display_text, tts_text, speaker_name, char_count, sentence_count, metadata_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        block.book_unit_id,
        block.block_order,
        block.block_type,
        block.display_text,
        block.tts_text,
        block.speaker_name,
        block.char_count,
        block.sentence_count,
        JSON.stringify({ migrated_from: "legacy_text" }),
      ],
    );

    const blockSentences = structured.sentences.filter(
      (sentence) => sentence.block_order === block.block_order,
    );

    for (const sentence of blockSentences) {
      await connection.query(
        `INSERT INTO book_unit_sentences
         (sentence_uuid, book_id, book_unit_id, block_id, sentence_order, sentence_in_block, display_text, tts_text, plain_text, start_offset, end_offset, duration_ms_estimate, audio_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'none', NOW(), NOW())`,
        [
          sentence.sentence_uuid,
          sentence.book_id,
          sentence.book_unit_id,
          blockResult.insertId,
          sentence.sentence_order,
          sentence.sentence_in_block,
          sentence.display_text,
          sentence.tts_text,
          sentence.plain_text,
          sentence.start_offset,
          sentence.end_offset,
          sentence.duration_ms_estimate,
        ],
      );
    }
  }

  await connection.query(
    `UPDATE book_units
     SET sentence_count = ?, word_count = ?, estimated_reading_minutes = ?, updated_at = NOW()
     WHERE id = ?`,
    [
      structured.stats.total_sentences,
      structured.stats.total_words,
      Math.max(1, Math.ceil(structured.stats.total_words / 180 || 0)),
      unitId,
    ],
  );

  await connection.query(
    `UPDATE books
     SET total_units = 1,
         total_blocks = ?,
         total_sentences = ?,
         total_words = ?,
         total_characters = ?,
         estimated_reading_minutes = ?,
         updated_at = NOW()
     WHERE id = ?`,
    [
      structured.stats.total_blocks,
      structured.stats.total_sentences,
      structured.stats.total_words,
      structured.stats.total_characters,
      Math.max(1, Math.ceil(structured.stats.total_words / 180 || 0)),
      book.id,
    ],
  );

  return structured.stats;
}

async function main() {
  const [books] = await db.query(
    `SELECT id, title, content_type, lifecycle_status, full_text
     FROM books
     ${bookIdFilter ? "WHERE id = ?" : ""}
     ORDER BY id ASC`,
    bookIdFilter ? [bookIdFilter] : [],
  );

  const candidates = [];

  for (const book of books) {
    if (await hasStructuredContent(book.id)) continue;
    const rawText = await getLegacyText(book.id, book.full_text);
    if (!rawText) continue;
    candidates.push({ book, rawText });
    if (limit && candidates.length >= limit) break;
  }

  const migrated = [];

  if (applyChanges) {
    for (const candidate of candidates) {
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        if (await hasStructuredContent(candidate.book.id, connection)) {
          await connection.rollback();
          continue;
        }
        const stats = await insertStructuredContent(connection, candidate.book, candidate.rawText);
        await connection.commit();
        migrated.push({
          id: candidate.book.id,
          title: candidate.book.title,
          ...stats,
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
  }

  console.log(JSON.stringify({
    apply: applyChanges,
    book_id: bookIdFilter || null,
    block_char_limit: blockCharLimit,
    candidates: candidates.length,
    migrated: migrated.length,
    items: applyChanges
      ? migrated
      : candidates.map((candidate) => ({
          id: candidate.book.id,
          title: candidate.book.title,
          chars: candidate.rawText.length,
        })),
  }, null, 2));

  await db.end();
}

main().catch(async (error) => {
  console.error("legacy content migration failed:", error.message);
  try {
    await db.end();
  } catch (_) {
    // Ignore shutdown errors after migration failure.
  }
  process.exit(1);
});
