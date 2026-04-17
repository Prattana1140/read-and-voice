const mysql = require("mysql2/promise");
require("dotenv").config();

const requiredEnv = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "DB_PORT"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1);
  }
}

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

// test connection
(async () => {
  try {
    const conn = await db.getConnection();
    console.log("✅ Connected to Railway MySQL");
    conn.release();
  } catch (err) {
    console.error("❌ Database connection failed:");
    console.error("message:", err.message);
    console.error("code:", err.code);
    console.error("host:", process.env.DB_HOST);
    console.error("port:", process.env.DB_PORT);
  }
})();

module.exports = db;