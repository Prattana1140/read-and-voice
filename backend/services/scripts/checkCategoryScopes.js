const path = require("node:path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
  quiet: true,
});

const db = require("../../config/db");
const { ensureCatalogAnalyticsSchema } = require("../catalogSchema");

async function ensureCategoryScopeSchema() {
  const [scopeColumns] = await db.query("SHOW COLUMNS FROM categories LIKE 'content_scope'");
  if (scopeColumns.length === 0) {
    await db.query("ALTER TABLE categories ADD COLUMN content_scope VARCHAR(20) NOT NULL DEFAULT 'all' AFTER parent_id");
    await db.query("ALTER TABLE categories ADD INDEX idx_categories_content_scope (content_scope)");
  }

  const [toneColumns] = await db.query("SHOW COLUMNS FROM categories LIKE 'display_tone'");
  if (toneColumns.length === 0) {
    await db.query("ALTER TABLE categories ADD COLUMN display_tone VARCHAR(40) NULL AFTER content_scope");
  }
}

async function main() {
  await ensureCatalogAnalyticsSchema();
  await ensureCategoryScopeSchema();
  await db.query(`
    UPDATE categories c
    SET c.content_scope = 'all'
    WHERE c.content_scope IN ('ebook', 'serial')
      AND EXISTS (
        SELECT 1
        FROM books b
        WHERE b.category_id = c.id
          AND COALESCE(b.content_type, 'ebook') <> c.content_scope
      )
  `);

  const [categoryScopeRows] = await db.query(
    `SELECT content_scope, COUNT(*) AS count
     FROM categories
     GROUP BY content_scope
     ORDER BY content_scope`,
  );

  const [serialOnlyRows] = await db.query(
    "SELECT COUNT(*) AS count FROM categories WHERE content_scope = 'serial'",
  );
  const [ebookOnlyRows] = await db.query(
    "SELECT COUNT(*) AS count FROM categories WHERE content_scope = 'ebook'",
  );
  const [invalidCategoryRows] = await db.query(
    `SELECT id, name, content_scope
     FROM categories
     WHERE content_scope NOT IN ('all', 'ebook', 'serial')
     LIMIT 20`,
  );
  const [invalidBookRows] = await db.query(
    `SELECT b.id, b.title, b.content_type, c.name AS category_name, c.content_scope
     FROM books b
     JOIN categories c ON c.id = b.category_id
     WHERE c.content_scope NOT IN ('all', COALESCE(b.content_type, 'ebook'))
     LIMIT 20`,
  );
  const [serialStatusRows] = await db.query(
    `SELECT content_type, serial_status, COUNT(*) AS count
     FROM books
     GROUP BY content_type, serial_status
     ORDER BY content_type, serial_status`,
  );
  const [ebookStatusMismatchRows] = await db.query(
    `SELECT id, title, serial_status
     FROM books
     WHERE COALESCE(content_type, 'ebook') <> 'serial'
       AND serial_status <> 'completed'
     LIMIT 20`,
  );

  const report = {
    categoryScopes: categoryScopeRows,
    serialCategoryCount: Number(serialOnlyRows[0]?.count || 0),
    ebookCategoryCount: Number(ebookOnlyRows[0]?.count || 0),
    serialStatuses: serialStatusRows,
  };

  console.log(JSON.stringify(report, null, 2));

  const failures = [];
  if (invalidCategoryRows.length) {
    failures.push(`Invalid category content_scope values: ${invalidCategoryRows.length}`);
    console.table(invalidCategoryRows);
  }
  if (invalidBookRows.length) {
    failures.push(`Books assigned to incompatible category scopes: ${invalidBookRows.length}`);
    console.table(invalidBookRows);
  }
  if (ebookStatusMismatchRows.length) {
    failures.push(`E-book rows with non-completed serial_status: ${ebookStatusMismatchRows.length}`);
    console.table(ebookStatusMismatchRows);
  }
  if (Number(serialOnlyRows[0]?.count || 0) === 0) {
    failures.push("No serial-scoped categories found");
  }

  if (failures.length) {
    throw new Error(failures.join("; "));
  }
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
