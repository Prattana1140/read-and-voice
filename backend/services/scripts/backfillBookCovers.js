const db = require("../../config/db");
const { ensureBooksHaveCovers } = require("../bookCover");

async function main() {
  const [rows] = await db.query(
    `SELECT id, title, subtitle, author, author_name, cover_image, cover_image_url
     FROM books
     ORDER BY id ASC`,
  );

  await ensureBooksHaveCovers(rows, db);
  const updatedCount = rows.filter((row) => String(row.cover_image || row.cover_image_url || "").trim()).length;

  console.log(`Backfilled covers for ${updatedCount} books.`);
  await db.end();
}

main().catch(async (error) => {
  console.error("Backfill book covers failed:", error);
  try {
    await db.end();
  } catch (_) {}
  process.exit(1);
});
