require("dotenv").config({ quiet: true });
const fs = require("fs");

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

function normalizeDbMode(value) {
  const mode = String(value || "auto").trim().toLowerCase();

  return ["auto", "local", "cloud"].includes(mode) ? mode : "auto";
}

function normalizePort(value) {
  const port = Number(value);

  return Number.isInteger(port) && port > 0 ? port : undefined;
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== ""))];
}

function isRailway() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_ENVIRONMENT_NAME ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID
  );
}

function isRender() {
  return Boolean(
    process.env.RENDER ||
      process.env.RENDER_EXTERNAL_URL ||
      process.env.RENDER_SERVICE_ID
  );
}

function applyPoolOptions(config) {
  return {
    ...config,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 8000,
  };
}

function fixRailwayPort(host, port) {
  if (!host) {
    return port;
  }

  if (host.endsWith(".railway.internal")) {
    return 3306;
  }

  return port;
}

function getBestPortsForHost(host, ports) {
  const validPorts = unique(ports.map(normalizePort));

  if (!host) {
    return validPorts.length > 0 ? validPorts : [3306];
  }

  if (host.endsWith(".railway.internal")) {
    return [3306];
  }

  if (host.endsWith(".proxy.rlwy.net")) {
    const publicPorts = validPorts.filter((port) => port !== 3306);
    return publicPorts.length > 0 ? publicPorts : validPorts;
  }

  return validPorts.length > 0 ? validPorts : [3306];
}

function getConfigFromDbEnv() {
  const password = firstEnv(["DB_PASSWORD"], { allowEmpty: true });

  return {
    source: "DB_*",
    host: firstEnv(["DB_HOST"]),
    port: normalizePort(firstEnv(["DB_PORT"])),
    user: firstEnv(["DB_USER"]),
    password: password !== undefined ? password : "",
    database: firstEnv(["DB_NAME"]),
  };
}

function getConfigFromPrefixedDbEnv(prefix, source) {
  const password = firstEnv([`${prefix}_DB_PASSWORD`], { allowEmpty: true });

  return {
    source,
    host: firstEnv([`${prefix}_DB_HOST`]),
    port: normalizePort(firstEnv([`${prefix}_DB_PORT`])),
    user: firstEnv([`${prefix}_DB_USER`]),
    password: password !== undefined ? password : "",
    database: firstEnv([`${prefix}_DB_NAME`]),
  };
}

function getConfigFromPrefixedUrl(prefix, source) {
  const urlConfig = parseDatabaseUrl(
    firstEnv([`${prefix}_DATABASE_URL`, `${prefix}_MYSQL_URL`])
  );

  return {
    source,
    ...urlConfig,
  };
}

function getConfigFromMysqlEnv() {
  const password = firstEnv(["MYSQLPASSWORD", "MYSQL_PASSWORD"], {
    allowEmpty: true,
  });

  return {
    source: "MYSQL*",
    host: firstEnv(["MYSQLHOST", "MYSQL_HOST"]),
    port: normalizePort(firstEnv(["MYSQLPORT", "MYSQL_PORT"])),
    user: firstEnv(["MYSQLUSER", "MYSQL_USER"]),
    password: password !== undefined ? password : "",
    database: firstEnv(["MYSQLDATABASE", "MYSQL_DATABASE"]),
  };
}

function getConfigFromUrl() {
  const urlConfig = parseDatabaseUrl(
    firstEnv(["DATABASE_URL", "MYSQL_URL", "MYSQL_PUBLIC_URL"])
  );

  return {
    source: "DATABASE_URL",
    ...urlConfig,
  };
}

function orderConfigsByMode(configsByName) {
  const dbMode = normalizeDbMode(process.env.DB_MODE);

  if (dbMode === "local") {
    return [
      configsByName.localFields,
      configsByName.localUrl,
      configsByName.dbFields,
      configsByName.mysqlFields,
      configsByName.url,
      configsByName.cloudFields,
      configsByName.cloudUrl,
    ];
  }

  if (dbMode === "cloud") {
    return [
      configsByName.cloudFields,
      configsByName.cloudUrl,
      configsByName.mysqlFields,
      configsByName.url,
      configsByName.dbFields,
      configsByName.localFields,
      configsByName.localUrl,
    ];
  }

  if (isRailway()) {
    return [
      configsByName.mysqlFields,
      configsByName.url,
      configsByName.cloudFields,
      configsByName.cloudUrl,
      configsByName.dbFields,
      configsByName.localFields,
      configsByName.localUrl,
    ];
  }

  if (isRender()) {
    return [
      configsByName.url,
      configsByName.cloudUrl,
      configsByName.cloudFields,
      configsByName.dbFields,
      configsByName.mysqlFields,
      configsByName.localFields,
      configsByName.localUrl,
    ];
  }

  return [
    configsByName.localFields,
    configsByName.localUrl,
    configsByName.dbFields,
    configsByName.mysqlFields,
    configsByName.url,
    configsByName.cloudFields,
    configsByName.cloudUrl,
  ];
}

function getExpandedConfigs(configs) {
  const hosts = unique(configs.map((config) => config.host));
  const ports = unique(configs.map((config) => config.port));
  const expanded = [];

  for (const config of configs) {
    if (!config.user || !config.database) {
      continue;
    }

    for (const host of hosts) {
      for (const port of getBestPortsForHost(host, ports)) {
        expanded.push({
          ...config,
          source: `${config.source}+expanded`,
          host,
          port,
        });
      }
    }
  }

  return expanded;
}

function finalizeConfig(config) {
  const port = fixRailwayPort(config.host, normalizePort(config.port) || 3306);

  return applyPoolOptions({
    ...config,
    port,
  });
}

function configHasDatabaseIdentity(config) {
  return Boolean(config.host && config.user && config.database);
}

function getDbConfigCandidates() {
  const configsByName = {
    localFields: getConfigFromPrefixedDbEnv("LOCAL", "LOCAL_DB_*"),
    localUrl: getConfigFromPrefixedUrl("LOCAL", "LOCAL_DATABASE_URL"),
    cloudFields: getConfigFromPrefixedDbEnv("CLOUD", "CLOUD_DB_*"),
    cloudUrl: getConfigFromPrefixedUrl("CLOUD", "CLOUD_DATABASE_URL"),
    dbFields: getConfigFromDbEnv(),
    mysqlFields: getConfigFromMysqlEnv(),
    url: getConfigFromUrl(),
  };
  const configs = Object.values(configsByName);
  const orderedConfigs = orderConfigsByMode(configsByName);
  const expandedConfigs = isRailway() ? getExpandedConfigs(configs) : [];

  const seen = new Set();

  return [...orderedConfigs, ...expandedConfigs]
    .map(finalizeConfig)
    .filter(configHasDatabaseIdentity)
    .filter((config) => {
      const key = `${config.host}:${config.port}:${config.user}:${config.database}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function describeDbEnvironment() {
  return {
    dbMode: normalizeDbMode(process.env.DB_MODE),
    railway: isRailway(),
    render: isRender(),
    hasLocalDbHost: Boolean(process.env.LOCAL_DB_HOST),
    hasLocalDbPort: Boolean(process.env.LOCAL_DB_PORT),
    hasLocalDbUser: Boolean(process.env.LOCAL_DB_USER),
    hasLocalDbPassword: process.env.LOCAL_DB_PASSWORD !== undefined,
    hasLocalDbName: Boolean(process.env.LOCAL_DB_NAME),
    hasLocalDatabaseUrl: Boolean(process.env.LOCAL_DATABASE_URL || process.env.LOCAL_MYSQL_URL),
    hasCloudDbHost: Boolean(process.env.CLOUD_DB_HOST),
    hasCloudDbPort: Boolean(process.env.CLOUD_DB_PORT),
    hasCloudDbUser: Boolean(process.env.CLOUD_DB_USER),
    hasCloudDbPassword: process.env.CLOUD_DB_PASSWORD !== undefined,
    hasCloudDbName: Boolean(process.env.CLOUD_DB_NAME),
    hasCloudDatabaseUrl: Boolean(process.env.CLOUD_DATABASE_URL || process.env.CLOUD_MYSQL_URL),
    hasDbHost: Boolean(process.env.DB_HOST),
    hasDbPort: Boolean(process.env.DB_PORT),
    hasDbUser: Boolean(process.env.DB_USER),
    hasDbPassword: process.env.DB_PASSWORD !== undefined,
    hasDbName: Boolean(process.env.DB_NAME),
    hasMysqlHost: Boolean(process.env.MYSQLHOST || process.env.MYSQL_HOST),
    hasMysqlPort: Boolean(process.env.MYSQLPORT || process.env.MYSQL_PORT),
    hasMysqlUser: Boolean(process.env.MYSQLUSER || process.env.MYSQL_USER),
    hasMysqlPassword:
      process.env.MYSQLPASSWORD !== undefined ||
      process.env.MYSQL_PASSWORD !== undefined,
    hasMysqlDatabase: Boolean(
      process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE
    ),
    hasDatabaseUrl: Boolean(
      process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL
    ),
    hasRenderExternalUrl: Boolean(process.env.RENDER_EXTERNAL_URL),
    hasDbSsl: Boolean(getSslConfig()),
  };
}

function getDbConfig() {
  return getDbConfigCandidates()[0] || finalizeConfig(getConfigFromDbEnv());
}

function validateDbConfig(config) {
  return ["host", "port", "user", "database"].filter((key) => !config[key]);
}

function toMysqlConfig(config) {
  const ssl = getSslConfig();

  return {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: config.waitForConnections,
    connectionLimit: config.connectionLimit,
    queueLimit: config.queueLimit,
    connectTimeout: config.connectTimeout,
    ...(ssl ? { ssl } : {}),
  };
}

function describeDbConfig(config) {
  return {
    source: config.source,
    host: config.host ? config.host.replace(/^[^.]+/, "***") : undefined,
    port: config.port,
    hasUser: Boolean(config.user),
    hasPassword: config.password !== undefined && config.password !== "",
    database: config.database,
    hasSsl: Boolean(getSslConfig()),
  };
}

function readTextFile(value) {
  if (!value) {
    return undefined;
  }

  try {
    return fs.readFileSync(value, "utf8");
  } catch (_error) {
    return undefined;
  }
}

function parseBooleanEnv(value) {
  return /^(1|true|yes|on|required)$/i.test(String(value || "").trim());
}

function getSslConfig() {
  const sslMode = String(
    firstEnv(["DB_SSL_MODE", "MYSQL_SSL_MODE", "DATABASE_SSL_MODE"], {
      allowEmpty: true,
    }) || ""
  )
    .trim()
    .toLowerCase();

  const ca =
    firstEnv(["DB_SSL_CA"], { allowEmpty: true }) ||
    readTextFile(firstEnv(["DB_SSL_CA_FILE", "MYSQL_SSL_CA_FILE"], { allowEmpty: true })) ||
    (() => {
      const base64 = firstEnv(["DB_SSL_CA_BASE64"], { allowEmpty: true });
      if (!base64) {
        return undefined;
      }

      try {
        return Buffer.from(base64, "base64").toString("utf8");
      } catch (_error) {
        return undefined;
      }
    })();

  const sslEnabled =
    parseBooleanEnv(firstEnv(["DB_SSL", "MYSQL_SSL"])) ||
    Boolean(ca) ||
    ["require", "required", "verify-ca", "verify-full"].includes(sslMode);

  if (!sslEnabled) {
    return undefined;
  }

  const rejectUnauthorized =
    parseBooleanEnv(firstEnv(["DB_SSL_REJECT_UNAUTHORIZED"])) ||
    ["verify-ca", "verify-full"].includes(sslMode);

  return {
    rejectUnauthorized,
    ...(ca ? { ca } : {}),
  };
}

module.exports = {
  describeDbEnvironment,
  describeDbConfig,
  getDbConfigCandidates,
  getDbConfig,
  toMysqlConfig,
  validateDbConfig,
};
