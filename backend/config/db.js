const mysql = require("mysql2/promise");
const {
  describeDbConfig,
  getDbConfig,
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

const db = mysql.createPool(dbConfig);

(async () => {
  try {
    const conn = await db.getConnection();
    console.log("Connected to MySQL", describeDbConfig(dbConfig));
    conn.release();
  } catch (err) {
    console.error("Database connection failed:");
    console.error("message:", err.message);
    console.error("code:", err.code);
    console.error("config:", describeDbConfig(dbConfig));
  }
})();

module.exports = db;
