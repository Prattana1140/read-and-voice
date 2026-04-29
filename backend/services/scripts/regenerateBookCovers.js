const db = require("../../config/db");
const { ensureBooksHaveCovers } = require("../bookCover");

async function main() {
  const [rows] = await db.query(
    `SELECT
       b.id,
       b.title,
       b.subtitle,
       b.author,
       b.author_name,
       b.description,
       b.cover_image,
       b.cover_image_url,
       c.name AS category_name
     FROM books b
     LEFT JOIN categories c ON c.id = b.category_id
     ORDER BY b.id ASC`,
  );

  await ensureBooksHaveCovers(rows, db, { force: true });

  console.log(`Regenerated contextual covers for ${rows.length} books.`);
  await db.end();
}

main().catch(async (error) => {
  console.error("Regenerate book covers failed:", error);
  try {
    await db.end();
  } catch (_) {}
  process.exit(1);
});
