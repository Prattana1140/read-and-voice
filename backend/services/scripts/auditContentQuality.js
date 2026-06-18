require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env"), quiet: true });

const db = require("../../config/db");
const { analyzeTextQuality, sanitizeBookText } = require("../fileParser");

function toText(value) {
  return sanitizeBookText(String(value || ""));
}

async function getBookPageText(bookId) {
  const [rows] = await db.query(
    `SELECT page_text
     FROM book_pages
     WHERE book_id = ?
     ORDER BY page_number ASC`,
    [bookId],
  );

  return rows.map((row) => row.page_text || "").filter(Boolean).join("\n\n");
}

async function getStructuredStats(bookId) {
  const [unitRows] = await db.query(
    `SELECT
       COUNT(*) AS total_units,
       COALESCE(SUM(sentence_count), 0) AS total_sentences,
       COALESCE(SUM(word_count), 0) AS total_words
     FROM book_units
     WHERE book_id = ?`,
    [bookId],
  );
  const [blockRows] = await db.query(
    `SELECT COUNT(*) AS total_blocks
     FROM book_unit_blocks bub
     JOIN book_units bu ON bu.id = bub.book_unit_id
     WHERE bu.book_id = ?`,
    [bookId],
  );

  return {
    total_units: Number(unitRows[0]?.total_units || 0),
    total_blocks: Number(blockRows[0]?.total_blocks || 0),
    total_sentences: Number(unitRows[0]?.total_sentences || 0),
    total_words: Number(unitRows[0]?.total_words || 0),
  };
}

async function main() {
  const [books] = await db.query(
    `SELECT id, title, content_type, source_type, process_status, lifecycle_status, full_text, total_pages
     FROM books
     ORDER BY id ASC`,
  );

  const items = [];

  for (const book of books) {
    const pageText = book.full_text ? "" : await getBookPageText(book.id);
    const text = toText(book.full_text || pageText);
    const quality = analyzeTextQuality(text);
    const structured = await getStructuredStats(book.id);
    const hasStructuredContent = structured.total_units > 0 && structured.total_sentences > 0;
    const needsReview =
      !text ||
      quality.needs_review ||
      !hasStructuredContent ||
      Number(book.total_pages || 0) === 0;

    items.push({
      id: book.id,
      title: book.title,
      content_type: book.content_type,
      source_type: book.source_type,
      lifecycle_status: book.lifecycle_status,
      process_status: book.process_status,
      total_pages: Number(book.total_pages || 0),
      text_chars: text.length,
      quality_score: quality.score,
      quality_status: quality.status,
      structured,
      needs_review: needsReview,
      review_reasons: [
        !text ? "no readable text" : null,
        quality.needs_review ? "low text quality" : null,
        !hasStructuredContent ? "missing unit/block/sentence content" : null,
        Number(book.total_pages || 0) === 0 ? "no saved pages" : null,
      ].filter(Boolean),
    });
  }

  const summary = {
    total_books: items.length,
    needs_review: items.filter((item) => item.needs_review).length,
    low_quality: items.filter((item) => item.quality_score < 78).length,
    missing_structured_content: items.filter((item) => item.structured.total_sentences === 0).length,
  };

  console.log(JSON.stringify({ summary, items }, null, 2));

  await db.end();
}

main().catch(async (error) => {
  console.error("content audit failed:", error.message);
  try {
    await db.end();
  } catch (_) {
    // Ignore shutdown errors after a failed audit.
  }
  process.exit(1);
});
