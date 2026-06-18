require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env"), quiet: true });

const fs = require("fs");
const path = require("path");
const db = require("../../config/db");
const { getProductionReadiness } = require("../readiness");

async function tableCount(tableName) {
  const [rows] = await db.query(`SELECT COUNT(*) AS total FROM \`${tableName}\``);
  return Number(rows[0]?.total || 0);
}

function checkPath(label, targetPath) {
  const exists = fs.existsSync(targetPath);
  return {
    name: label,
    ok: exists,
    message: exists ? `${label} exists` : `${label} is missing`,
    path: targetPath,
  };
}

async function main() {
  const startedAt = Date.now();
  const dbPingStarted = Date.now();
  await db.query("SELECT 1 AS ok");
  const dbPingMs = Date.now() - dbPingStarted;

  const readiness = getProductionReadiness();
  const uploadRoot = path.join(__dirname, "..", "..", "uploads");
  const checks = [
    {
      name: "database",
      ok: true,
      message: `database responded in ${dbPingMs}ms`,
    },
    {
      name: "readiness",
      ok: readiness.ready,
      message: readiness.ready
        ? "readiness checks pass"
        : `${readiness.failed.length} readiness checks failed`,
    },
    checkPath("uploads", uploadRoot),
    checkPath("book-covers", path.join(uploadRoot, "book-covers")),
    checkPath("book-files", path.join(uploadRoot, "book-files")),
  ];

  const counts = {
    users: await tableCount("users"),
    books: await tableCount("books"),
    orders: await tableCount("orders"),
    coin_topups: await tableCount("coin_topup_orders").catch(() => 0),
    support_tickets: await tableCount("support_tickets").catch(() => 0),
  };

  const report = {
    ok: checks.every((check) => check.ok),
    checked_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    counts,
    checks,
    readiness_failed: readiness.failed,
  };

  console.log(JSON.stringify(report, null, 2));
  await db.end();
  if (!report.ok) process.exit(1);
}

main().catch(async (error) => {
  console.error("monitor check failed:", error.message);
  try {
    await db.end();
  } catch (_) {
    // Ignore shutdown errors after a failed monitor check.
  }
  process.exit(1);
});
