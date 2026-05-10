const mysql = require("mysql2/promise");
require("dotenv").config({ quiet: true });

const REQUIRED_REMOTE_SUFFIX = ".aivencloud.com";
const BATCH_SIZE = Number(process.env.DB_SYNC_BATCH_SIZE || 500);

function parsePort(value, fallback) {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : fallback;
}

function quoteId(value) {
  return `\`${String(value).replace(/`/g, "``")}\``;
}

function parseRemoteUrl() {
  const rawUrl = process.env.DATABASE_URL || process.env.CLOUD_DATABASE_URL;
  if (!rawUrl) {
    throw new Error("Missing DATABASE_URL for Aiven target.");
  }

  const url = new URL(rawUrl);
  const host = url.hostname.toLowerCase();
  const blockedHosts = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

  if (blockedHosts.has(host) || host.endsWith(".local")) {
    throw new Error(`Refusing to write to local target host: ${host}`);
  }

  if (!host.endsWith(REQUIRED_REMOTE_SUFFIX)) {
    throw new Error(`Refusing to write to non-Aiven target host: ${host}`);
  }

  return {
    host: url.hostname,
    port: parsePort(url.port, 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password || ""),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    ssl: { rejectUnauthorized: false },
  };
}

function getLocalConfig() {
  const host = process.env.LOCAL_DB_HOST || "127.0.0.1";
  const blockedTargetHosts = new Set(["localhost", "127.0.0.1", "::1"]);

  if (!blockedTargetHosts.has(host.toLowerCase())) {
    throw new Error(`Refusing to read non-local source host: ${host}`);
  }

  return {
    host,
    port: parsePort(process.env.LOCAL_DB_PORT, 3306),
    user: process.env.LOCAL_DB_USER || "root",
    password: process.env.LOCAL_DB_PASSWORD || "",
    database: process.env.LOCAL_DB_NAME || "read_and_voice",
  };
}

async function getTables(connection) {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
  );

  return rows.map((row) => row.TABLE_NAME);
}

async function getColumns(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [tableName],
  );

  return rows.map((row) => row.COLUMN_NAME);
}

async function ensureRemoteTable(localConnection, remoteConnection, tableName, remoteTables) {
  if (remoteTables.has(tableName)) return;

  const [rows] = await localConnection.query(`SHOW CREATE TABLE ${quoteId(tableName)}`);
  const createSql = rows[0]?.["Create Table"];
  if (!createSql) {
    throw new Error(`Unable to read CREATE TABLE for ${tableName}`);
  }

  await remoteConnection.query(createSql);
  remoteTables.add(tableName);
  console.log(`Created remote table ${tableName}`);
}

async function copyTable(localConnection, remoteConnection, tableName) {
  const localColumns = await getColumns(localConnection, tableName);
  const remoteColumns = new Set(await getColumns(remoteConnection, tableName));
  const columns = localColumns.filter((column) => remoteColumns.has(column));

  if (columns.length === 0) {
    console.log(`Skipped ${tableName}: no shared columns`);
    return 0;
  }

  await remoteConnection.query(`TRUNCATE TABLE ${quoteId(tableName)}`);

  const [[countRow]] = await localConnection.query(
    `SELECT COUNT(*) AS total FROM ${quoteId(tableName)}`,
  );
  const total = Number(countRow?.total || 0);

  if (total === 0) {
    console.log(`Copied ${tableName}: 0 rows`);
    return 0;
  }

  const columnSql = columns.map(quoteId).join(", ");
  let copied = 0;

  while (copied < total) {
    const [rows] = await localConnection.query(
      `SELECT ${columnSql}
       FROM ${quoteId(tableName)}
       LIMIT ? OFFSET ?`,
      [BATCH_SIZE, copied],
    );

    if (!rows.length) break;

    await remoteConnection.query(
      `INSERT INTO ${quoteId(tableName)} (${columnSql}) VALUES ?`,
      [rows.map((row) => columns.map((column) => row[column]))],
    );

    copied += rows.length;
  }

  console.log(`Copied ${tableName}: ${copied} rows`);
  return copied;
}

async function main() {
  const sourceConfig = getLocalConfig();
  const targetConfig = parseRemoteUrl();

  console.log("Sync source verified:");
  console.log(`- local host: ${sourceConfig.host}`);
  console.log(`- local database: ${sourceConfig.database}`);
  console.log("Sync target verified:");
  console.log(`- remote host: ${targetConfig.host}`);
  console.log(`- remote database: ${targetConfig.database}`);

  const localConnection = await mysql.createConnection(sourceConfig);
  const remoteConnection = await mysql.createConnection(targetConfig);

  try {
    const localTables = await getTables(localConnection);
    const remoteTables = new Set(await getTables(remoteConnection));

    await remoteConnection.query("SET FOREIGN_KEY_CHECKS = 0");

    let totalRows = 0;
    for (const tableName of localTables) {
      await ensureRemoteTable(localConnection, remoteConnection, tableName, remoteTables);
      totalRows += await copyTable(localConnection, remoteConnection, tableName);
    }

    console.log(`Local to remote sync complete: ${localTables.length} tables, ${totalRows} rows.`);
  } finally {
    try {
      await remoteConnection.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch (_) {}
    await localConnection.end();
    await remoteConnection.end();
  }
}

main().catch((error) => {
  console.error("Local to remote sync failed:", error);
  process.exit(1);
});
