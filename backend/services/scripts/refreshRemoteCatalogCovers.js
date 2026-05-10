require("dotenv").config({ quiet: true });

const REQUIRED_HOST_SUFFIX = ".aivencloud.com";
const launchCovers = [
  "launch-city-voice.svg",
  "launch-small-garden.svg",
  "launch-rain-bookshop.svg",
  "launch-work-heart.svg",
  "launch-last-station.svg",
  "launch-starlight-child.svg",
  "launch-small-system.svg",
  "launch-better-sleep.svg",
  "launch-future-letter.svg",
  "launch-mother-kitchen.svg",
  "launch-midnight-library.svg",
  "launch-rain-call-case.svg",
  "launch-time-cafe.svg",
  "launch-canal-magic-school.svg",
  "launch-memory-repair.svg",
  "launch-sleepless-planet.svg",
  "launch-shadow-writer.svg",
  "launch-voice-guardian.svg",
  "launch-old-market-files.svg",
  "launch-last-terminal-love.svg",
];

function verifyRemoteTarget() {
  const rawUrl = process.env.DATABASE_URL || process.env.CLOUD_DATABASE_URL;

  if (!rawUrl) {
    throw new Error("Missing DATABASE_URL. Refusing to refresh covers.");
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
    throw new Error(`Refusing to update local database host: ${host}`);
  }

  if (!host.endsWith(REQUIRED_HOST_SUFFIX)) {
    throw new Error(
      `Refusing to update non-Aiven host: ${host}. Expected ${REQUIRED_HOST_SUFFIX}.`,
    );
  }

  process.env.DB_MODE = "cloud";
  process.env.DB_SSL = "true";
  process.env.DB_SSL_MODE = "require";
  process.env.LOCAL_DB_HOST = "";
  process.env.LOCAL_DB_PORT = "";
  process.env.LOCAL_DB_USER = "";
  process.env.LOCAL_DB_PASSWORD = "";
  process.env.LOCAL_DB_NAME = "";

  return {
    host,
    database: url.pathname.replace(/^\//, "") || "(none)",
  };
}

async function main() {
  const target = verifyRemoteTarget();
  const db = require("../../config/db");

  console.log("Remote cover refresh target verified:");
  console.log(`- host: ${target.host}`);
  console.log(`- database: ${target.database}`);

  const [books] = await db.query(
    `SELECT id, title
     FROM books
     WHERE is_published = 1
     ORDER BY COALESCE(is_best_seller, 0) DESC,
              COALESCE(is_recommended, 0) DESC,
              COALESCE(is_new_release, 0) DESC,
              id ASC`,
  );

  for (let index = 0; index < books.length; index += 1) {
    const coverPath = `/uploads/book-covers/${launchCovers[index % launchCovers.length]}`;
    await db.query(
      `UPDATE books
       SET cover_image = ?,
           cover_image_url = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [coverPath, coverPath, books[index].id],
    );
  }

  await db.end();
  console.log(`Updated ${books.length} published books to static launch covers.`);
}

main().catch(async (error) => {
  console.error("Remote cover refresh failed:", error);
  process.exit(1);
});
