const mysql = require("mysql2/promise");
const {
  describeDbConfig,
  getDbConfigCandidates,
  getDbConfig,
  toMysqlConfig,
  validateDbConfig,
} = require("./dbSettings");

const dbConfig = getDbConfig();
const missingConfig = validateDbConfig(dbConfig);

if (missingConfig.length > 0) {
  console.error(`Missing database config: ${missingConfig.join(", ")}`);
  console.error(
    "Set DB_HOST/DB_USER/DB_PASSWORD/DB_NAME/DB_PORT or Railway MYSQLHOST/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE/MYSQLPORT."
  );
  process.exit(1);
}

const db = mysql.createPool(toMysqlConfig(dbConfig));

(async () => {
  const candidates = getDbConfigCandidates();

  for (const config of candidates) {
    try {
      const testPool = mysql.createPool(toMysqlConfig(config));
      const conn = await testPool.getConnection();

      console.log("Connected to MySQL", describeDbConfig(config));
      conn.release();

      if (config !== dbConfig) {
        await testPool.end();
      }

      return;
    } catch (err) {
      console.error("Database connection failed:", err.message);
      console.error("code:", err.code);
      console.error("config:", describeDbConfig(config));
    }
  }
})();

module.exports = db;
