require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env"), quiet: true });

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const mysql = require("mysql2");
const db = require("../../config/db");

function getLocalConfig() {
  return {
    host: process.env.LOCAL_DB_HOST || process.env.DB_HOST || "127.0.0.1",
    port: process.env.LOCAL_DB_PORT || process.env.DB_PORT || "3306",
    user: process.env.LOCAL_DB_USER || process.env.DB_USER || "root",
    password: process.env.LOCAL_DB_PASSWORD || process.env.DB_PASSWORD || "",
    database: process.env.LOCAL_DB_NAME || process.env.DB_NAME || "read_and_voice",
  };
}

function getDatabaseUrlConfig() {
  if (!process.env.DATABASE_URL) return null;
  const url = new URL(process.env.DATABASE_URL);
  return {
    host: url.hostname,
    port: url.port || "3306",
    user: decodeURIComponent(url.username || ""),
    password: decodeURIComponent(url.password || ""),
    database: url.pathname.replace(/^\//, ""),
  };
}

function getBackupConfig() {
  const dbMode = String(process.env.DB_MODE || "local").toLowerCase();
  if (dbMode !== "local") return getDatabaseUrlConfig() || getLocalConfig();
  return getLocalConfig();
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function cleanupOldBackups(backupDir) {
  const retentionDays = Number(process.env.DB_BACKUP_RETENTION_DAYS || 14);
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return [];

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const removed = [];

  for (const file of fs.readdirSync(backupDir)) {
    if (!file.toLowerCase().endsWith(".sql")) continue;
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    if (stats.mtime.getTime() >= cutoff) continue;
    fs.unlinkSync(filePath);
    removed.push(file);
  }

  return removed;
}

async function main() {
  const config = getBackupConfig();
  const backupDir = process.env.DB_BACKUP_DIR || path.join(__dirname, "..", "..", "backups", "manual");
  const dumpCommand = process.env.MYSQLDUMP_COMMAND || "mysqldump";
  const filePath = path.join(backupDir, `${config.database}-${timestamp()}.sql`);

  fs.mkdirSync(backupDir, { recursive: true });

  const args = [
    `--host=${config.host}`,
    `--port=${config.port}`,
    `--user=${config.user}`,
    "--single-transaction",
    "--routines",
    "--triggers",
    "--default-character-set=utf8mb4",
    config.database,
  ];

  const output = fs.createWriteStream(filePath, { flags: "wx" });
  let child;

  try {
    child = spawn(dumpCommand, args, {
      env: {
        ...process.env,
        MYSQL_PWD: config.password,
      },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    output.end();
    fs.unlinkSync(filePath);
    return backupWithNode(filePath, config);
  }

  child.stdout.pipe(output);

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  }).catch(async (error) => {
    output.end();
    try {
      fs.unlinkSync(filePath);
    } catch (_) {
      // Ignore cleanup errors after mysqldump spawn failure.
    }
    console.warn(`mysqldump unavailable (${error.message}); falling back to Node backup.`);
    await backupWithNode(filePath, config);
    return null;
  });

  if (exitCode === null) return;

  output.end();

  if (exitCode !== 0) {
    try {
      fs.unlinkSync(filePath);
    } catch (_) {
      // Ignore cleanup errors when backup failed.
    }
    throw new Error(`mysqldump failed with exit code ${exitCode}: ${stderr.trim()}`);
  }

  const stats = fs.statSync(filePath);
  const removed_old_backups = cleanupOldBackups(backupDir);
  console.log(JSON.stringify({
    ok: true,
    method: "mysqldump",
    file: filePath,
    bytes: stats.size,
    database: config.database,
    host: config.host,
    removed_old_backups,
  }, null, 2));
}

async function backupWithNode(filePath, config) {
  const lines = [
    "-- Read and Voice logical backup",
    `-- Created at ${new Date().toISOString()}`,
    `-- Database: ${config.database}`,
    "SET FOREIGN_KEY_CHECKS=0;",
    "",
  ];

  const [tableRows] = await db.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
  const tableKey = Object.keys(tableRows[0] || {})[0];
  const tables = tableRows.map((row) => row[tableKey]).filter(Boolean);

  for (const table of tables) {
    const escapedTable = `\`${String(table).replace(/`/g, "``")}\``;
    const [createRows] = await db.query(`SHOW CREATE TABLE ${escapedTable}`);
    const createSql = createRows[0]?.["Create Table"];
    lines.push(`DROP TABLE IF EXISTS ${escapedTable};`);
    lines.push(`${createSql};`);

    const [rows] = await db.query(`SELECT * FROM ${escapedTable}`);
    if (rows.length) {
      const columns = Object.keys(rows[0]);
      const columnSql = columns.map((column) => `\`${column.replace(/`/g, "``")}\``).join(", ");
      for (const row of rows) {
        const values = columns.map((column) => mysql.escape(row[column])).join(", ");
        lines.push(`INSERT INTO ${escapedTable} (${columnSql}) VALUES (${values});`);
      }
    }
    lines.push("");
  }

  lines.push("SET FOREIGN_KEY_CHECKS=1;");
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
  const stats = fs.statSync(filePath);
  const removed_old_backups = cleanupOldBackups(path.dirname(filePath));
  await db.end();
  console.log(JSON.stringify({
    ok: true,
    method: "node-mysql",
    file: filePath,
    bytes: stats.size,
    database: config.database,
    host: config.host,
    tables: tables.length,
    removed_old_backups,
  }, null, 2));
}

main().catch((error) => {
  console.error("database backup failed:", error.message);
  process.exit(1);
});
