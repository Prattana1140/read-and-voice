const { spawnSync } = require("child_process");
require("dotenv").config({ quiet: true });

const REQUIRED_HOST_SUFFIX = ".aivencloud.com";
const COMMANDS = [
  ["npm", ["run", "db:test"]],
  ["npm", ["run", "db:init"]],
  ["npm", ["run", "db:migrate:content"]],
  ["npm", ["run", "db:migrate:tts-architecture"]],
  ["npm", ["run", "db:migrate:commerce"]],
  ["npm", ["run", "db:migrate:subscriptions"]],
  ["npm", ["run", "db:seed:catalog"]],
  ["npm", ["run", "db:seed:platform"]],
];

function parseTargetUrl() {
  const rawUrl = process.env.DATABASE_URL || process.env.CLOUD_DATABASE_URL;

  if (!rawUrl) {
    throw new Error(
      "Missing DATABASE_URL. Set it to the Aiven MySQL Service URI before running this command.",
    );
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch (_error) {
    throw new Error("DATABASE_URL is not a valid URL.");
  }

  const host = url.hostname.toLowerCase();
  const blockedHosts = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

  if (blockedHosts.has(host) || host.endsWith(".local")) {
    throw new Error(`Refusing to seed local database host: ${host}`);
  }

  if (!host.endsWith(REQUIRED_HOST_SUFFIX)) {
    throw new Error(
      `Refusing to seed non-Aiven host: ${host}. Expected a host ending with ${REQUIRED_HOST_SUFFIX}.`,
    );
  }

  return {
    host,
    database: url.pathname.replace(/^\//, "") || "(none)",
  };
}

function buildChildEnv() {
  return {
    ...process.env,
    DB_MODE: "cloud",
    DB_SSL: "true",
    DB_SSL_MODE: "require",
    LOCAL_DB_HOST: "",
    LOCAL_DB_PORT: "",
    LOCAL_DB_USER: "",
    LOCAL_DB_PASSWORD: "",
    LOCAL_DB_NAME: "",
    LOCAL_DATABASE_URL: "",
    LOCAL_MYSQL_URL: "",
  };
}

function assertDemoSeedAllowed() {
  const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";
  const allowProductionSeed = /^(1|true|yes)$/i.test(process.env.ALLOW_DEMO_SEED_IN_PRODUCTION || "");

  if (isProduction && !allowProductionSeed) {
    throw new Error(
      "Refusing to run remote demo seed while NODE_ENV=production. Use a separate demo database, or set ALLOW_DEMO_SEED_IN_PRODUCTION=true only when this is intentionally not real user data.",
    );
  }
}

function run(command, args, env) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function main() {
  assertDemoSeedAllowed();

  const target = parseTargetUrl();

  console.log("Remote seed target verified:");
  console.log(`- host: ${target.host}`);
  console.log(`- database: ${target.database}`);
  console.log("Local database environment variables will be ignored for child commands.");

  const env = buildChildEnv();
  for (const [command, args] of COMMANDS) {
    run(command, args, env);
  }

  console.log("\nRemote demo seed complete.");
}

try {
  main();
} catch (error) {
  console.error(`Remote seed aborted: ${error.message}`);
  process.exit(1);
}
