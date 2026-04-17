const mysql = require("mysql2/promise");
const {
  describeDbConfig,
  getDbConfig,
  validateDbConfig,
} = require("../../config/dbSettings");

async function main() {
  const dbConfig = getDbConfig();
  const missingConfig = validateDbConfig(dbConfig);

  console.log("Database config:", describeDbConfig(dbConfig));

  if (missingConfig.length > 0) {
    throw new Error(`Missing database config: ${missingConfig.join(", ")}`);
  }

  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.query("SELECT 1 AS ok");
  await conn.end();

  console.log("Database connection OK:", rows);
}

main().catch((error) => {
  console.error("Database connection failed:");
  console.error("message:", error.message);
  console.error("code:", error.code);
  process.exit(1);
});
