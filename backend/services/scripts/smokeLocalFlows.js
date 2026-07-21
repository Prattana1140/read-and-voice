require("dotenv").config({ quiet: true });

const DEFAULT_API_URL = "http://localhost:3000";
const DEFAULT_WEB_URL = "http://127.0.0.1:5173";

const webRoutes = [
  "/",
  "/store",
  "/serials",
  "/search",
  "/categories",
  "/tags",
  "/login",
  "/register",
  "/profile",
  "/account/notifications",
  "/account/following",
  "/account/devices",
  "/writer",
  "/writer/upload",
  "/admin",
  "/admin/approvals",
  "/admin/payments",
  "/superadmin/settings",
];

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function getApiBaseUrl() {
  return trimTrailingSlash(readEnv("SMOKE_API_BASE_URL") || readEnv("API_PUBLIC_URL") || DEFAULT_API_URL);
}

function getWebBaseUrl() {
  return trimTrailingSlash(readEnv("SMOKE_WEB_BASE_URL") || readEnv("FRONTEND_URL") || DEFAULT_WEB_URL);
}

async function requestJson(apiBaseUrl, endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${apiBaseUrl}${endpoint}`;
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (_error) {
    data = text;
  }

  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : text.slice(0, 200);
    throw new Error(`${endpoint}: ${response.status} ${response.statusText}: ${message}`);
  }

  return data;
}

async function requestText(url) {
  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`);
  }

  return text;
}

async function login(apiBaseUrl) {
  const email = readEnv("SMOKE_USER_EMAIL");
  const password = readEnv("SMOKE_USER_PASSWORD");

  if (!email || !password) {
    throw new Error("Missing SMOKE_USER_EMAIL or SMOKE_USER_PASSWORD");
  }

  const data = await requestJson(apiBaseUrl, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!data?.token) {
    throw new Error("Login response did not include token");
  }

  return data.token;
}

function extractList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

async function checkWebRoutes(webBaseUrl) {
  for (const route of webRoutes) {
    const html = await requestText(`${webBaseUrl}${route}`);
    if (!html.includes('<div id="app"></div>')) {
      throw new Error(`Web route ${route} did not return the Vue app shell`);
    }
    console.log(`OK web ${route}`);
  }
}

async function checkAgeAndCatalogFlows(apiBaseUrl) {
  const token = await login(apiBaseUrl);
  const authHeaders = { Authorization: `Bearer ${token}` };

  const profileBefore = await requestJson(apiBaseUrl, "/api/profile/me", {
    headers: authHeaders,
  });
  console.log(`OK profile age_verified=${Number(profileBefore.profile?.age_verified ?? profileBefore.age_verified ?? 0)}`);

  const verified = await requestJson(apiBaseUrl, "/api/profile/me/verify-age", {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ confirmed_over_18: true }),
  });
  if (Number(verified.profile?.age_verified || 0) !== 1) {
    throw new Error("Age verification did not return age_verified=1");
  }
  console.log("OK verify-age");

  const tags = extractList(await requestJson(apiBaseUrl, "/api/books/tags"));
  console.log(`OK tags count=${tags.length}`);

  const books = extractList(await requestJson(apiBaseUrl, "/api/books"));
  const firstBook = books.find((book) => Number(book?.id) > 0);
  if (!firstBook) {
    console.log("SKIP catalog detail: no public book found");
    return;
  }

  const detail = await requestJson(apiBaseUrl, `/api/books/${firstBook.id}`);
  if (!Array.isArray(detail?.tags)) {
    throw new Error(`Book #${firstBook.id} did not include tags array`);
  }
  console.log(`OK book detail #${firstBook.id} tags=${detail.tags.length} age=${detail.age_rating || "general"}`);

  await requestJson(apiBaseUrl, `/api/reader/books/${firstBook.id}/access`, {
    headers: authHeaders,
  });
  console.log(`OK reader access #${firstBook.id}`);

  await requestJson(apiBaseUrl, "/api/account/notifications", {
    headers: authHeaders,
  });
  console.log("OK account notifications");

  await requestJson(apiBaseUrl, "/api/account/following", {
    headers: authHeaders,
  });
  console.log("OK account following");

  await requestJson(apiBaseUrl, "/api/account/devices", {
    headers: authHeaders,
  });
  console.log("OK account devices");

  await requestJson(apiBaseUrl, "/api/account/devices/logout-all", {
    method: "POST",
    headers: authHeaders,
  });
  console.log("OK logout all devices");
}

async function main() {
  const apiBaseUrl = getApiBaseUrl();
  const webBaseUrl = getWebBaseUrl();

  console.log(`Local flow API: ${apiBaseUrl}`);
  console.log(`Local flow Web: ${webBaseUrl}`);

  await checkWebRoutes(webBaseUrl);
  await checkAgeAndCatalogFlows(apiBaseUrl);

  console.log("\nLocal flow smoke test passed.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
