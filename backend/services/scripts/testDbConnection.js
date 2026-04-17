const mysql = require("mysql2/promise");
const {
  describeDbEnvironment,
  describeDbConfig,
  getDbConfigCandidates,
  toMysqlConfig,
  validateDbConfig,
} = require("../../config/dbSettings");

async function main() {
  const candidates = getDbConfigCandidates();

  console.log("Database environment:", describeDbEnvironment());

  if (candidates.length === 0) {
    throw new Error("Missing database config");
  }

  let lastError;

  for (const dbConfig of candidates) {
    const missingConfig = validateDbConfig(dbConfig);

    console.log("Trying database config:", describeDbConfig(dbConfig));

    if (missingConfig.length > 0) {
      lastError = new Error(`Missing database config: ${missingConfig.join(", ")}`);
      continue;
    }

    try {
      const conn = await mysql.createConnection(toMysqlConfig(dbConfig));
      const [rows] = await conn.query("SELECT 1 AS ok");
      await conn.end();

      console.log("Database connection OK:", rows);
      return;
    } catch (error) {
      lastError = error;
      console.error("Database candidate failed:", error.message);
      console.error("code:", error.code);
    }
  }

  throw lastError;
}

main().catch((error) => {
  console.error("Database connection failed:", error.message);
  console.error("code:", error.code);
  process.exit(1);
});
