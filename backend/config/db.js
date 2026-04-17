const mysql = require("mysql2/promise");
const {
  describeDbEnvironment,
  describeDbConfig,
  getDbConfigCandidates,
  toMysqlConfig,
  validateDbConfig,
} = require("./dbSettings");

const candidates = getDbConfigCandidates();

console.log("Database environment:", describeDbEnvironment());
console.log(
  "Database candidates:",
  candidates.map((candidate) => describeDbConfig(candidate))
);

if (candidates.length === 0) {
  console.error("Missing database config.");
  console.error(
    "Set DB_HOST/DB_USER/DB_PASSWORD/DB_NAME/DB_PORT or Railway MYSQLHOST/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE/MYSQLPORT."
  );
  process.exit(1);
}

let activePoolPromise;
let activeConfig;

async function createVerifiedPool(config) {
  const pool = mysql.createPool(toMysqlConfig(config));
  const conn = await pool.getConnection();
  conn.release();
  return pool;
}

async function connectPool() {
  for (const config of candidates) {
    const missingConfig = validateDbConfig(config);

    if (missingConfig.length > 0) {
      console.error(`Skipping database config with missing fields: ${missingConfig.join(", ")}`);
      console.error("config:", describeDbConfig(config));
      continue;
    }

    try {
      const pool = await createVerifiedPool(config);

      activeConfig = config;
      console.log("Connected to MySQL", describeDbConfig(config));
      return pool;
    } catch (err) {
      console.error("Database connection failed:", err.message);
      console.error("code:", err.code);
      console.error("config:", describeDbConfig(config));
    }
  }

  throw new Error("Unable to connect to any configured MySQL database.");
}

function getActivePool() {
  if (!activePoolPromise) {
    activePoolPromise = connectPool().catch((error) => {
      activePoolPromise = undefined;
      throw error;
    });
  }

  return activePoolPromise;
}

function resetActivePool() {
  activePoolPromise = undefined;
  activeConfig = undefined;
}

const db = {
  async query(...args) {
    const pool = await getActivePool();
    return pool.query(...args);
  },

  async execute(...args) {
    const pool = await getActivePool();
    return pool.execute(...args);
  },

  async getConnection() {
    const pool = await getActivePool();
    return pool.getConnection();
  },

  async end() {
    if (!activePoolPromise) {
      return;
    }

    const pool = await activePoolPromise;
    await pool.end();
    resetActivePool();
  },

  getActiveConfig() {
    return activeConfig ? describeDbConfig(activeConfig) : undefined;
  },
};

getActivePool().catch((err) => {
  console.error("Database startup check failed:", err.message);
});

module.exports = db;
