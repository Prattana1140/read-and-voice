require("dotenv").config({ quiet: true });

function firstEnv(names, options = {}) {
  const { allowEmpty = false } = options;

  for (const name of names) {
    const value = process.env[name];

    if (value !== undefined && (allowEmpty || value !== "")) {
      return value;
    }
  }

  return undefined;
}

function parseDatabaseUrl(value) {
  if (!value) {
    return {};
  }

  try {
    const url = new URL(value);

    return {
      host: url.hostname || undefined,
      port: url.port ? Number(url.port) : undefined,
      user: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : "",
      database: url.pathname ? decodeURIComponent(url.pathname.replace(/^\//, "")) : undefined,
    };
  } catch (_error) {
    return {};
  }
}

function normalizePort(value) {
  const port = Number(value);

  return Number.isInteger(port) && port > 0 ? port : undefined;
}

function getDbConfig() {
  const urlConfig = parseDatabaseUrl(
    firstEnv(["DATABASE_URL", "MYSQL_URL", "MYSQL_PUBLIC_URL"])
  );

  const password = firstEnv(
    ["DB_PASSWORD", "MYSQLPASSWORD", "MYSQL_PASSWORD"],
    { allowEmpty: true }
  );

  return {
    host: firstEnv(["DB_HOST", "MYSQLHOST", "MYSQL_HOST"]) || urlConfig.host,
    port:
      normalizePort(firstEnv(["DB_PORT", "MYSQLPORT", "MYSQL_PORT"])) ||
      normalizePort(urlConfig.port) ||
      3306,
    user: firstEnv(["DB_USER", "MYSQLUSER", "MYSQL_USER"]) || urlConfig.user,
    password: password !== undefined ? password : urlConfig.password || "",
    database:
      firstEnv(["DB_NAME", "MYSQLDATABASE", "MYSQL_DATABASE"]) ||
      urlConfig.database,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 10000,
  };
}

function validateDbConfig(config) {
  return ["host", "port", "user", "database"].filter((key) => !config[key]);
}

function describeDbConfig(config) {
  return {
    host: config.host ? config.host.replace(/^[^.]+/, "***") : undefined,
    port: config.port,
    hasUser: Boolean(config.user),
    hasPassword: config.password !== undefined && config.password !== "",
    database: config.database,
  };
}

module.exports = {
  describeDbConfig,
  getDbConfig,
  validateDbConfig,
};
