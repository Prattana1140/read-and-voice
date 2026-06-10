require("dotenv").config({ quiet: true });

const DEFAULT_API_URL = "http://localhost:3000";

const publicEndpoints = [
  "/api",
  "/health",
  "/api/books",
  "/api/ebooks",
  "/api/serials",
  "/api/best-sellers",
  "/api/new-releases",
  "/api/free-books",
  "/api/recommended",
  "/api/categories",
  "/api/page-content",
];

const roleChecks = [
  {
    key: "USER",
    label: "user",
    endpoints: [
      "/api/auth/me",
      "/api/profile/me",
      "/api/library/me",
      "/api/wishlist",
      "/api/cart",
      "/api/orders/history",
      "/api/coins/wallet",
      "/api/coins/packages",
      "/api/coins/transactions",
    ],
  },
  {
    key: "WRITER",
    label: "writer",
    endpoints: [
      "/api/auth/me",
      "/api/writer/books/mine",
      "/api/writer/books/stats",
      "/api/writers/me/profile",
    ],
  },
  {
    key: "ADMIN",
    label: "admin",
    endpoints: [
      "/api/auth/me",
      "/api/admin/stats/summary",
      "/api/admin/books/pending",
      "/api/admin/users",
      "/api/admin/coin-topups",
      "/api/admin/payment-approvals",
      "/api/admin/password-resets",
      "/api/support/tickets",
    ],
  },
  {
    key: "SUPERADMIN",
    label: "superadmin",
    endpoints: [
      "/api/auth/me",
      "/api/admin/users",
      "/api/admin/settings/checklist",
      "/api/admin/settings/system",
      "/api/admin/settings/readiness",
      "/api/admin/password-resets",
    ],
  },
];

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function getApiBaseUrl() {
  return (readEnv("SMOKE_API_BASE_URL") || readEnv("API_PUBLIC_URL") || DEFAULT_API_URL).replace(/\/+$/, "");
}

function getCredentials(role) {
  return {
    email: readEnv(`SMOKE_${role.key}_EMAIL`),
    password: readEnv(`SMOKE_${role.key}_PASSWORD`),
  };
}

async function request(apiBaseUrl, endpoint, options = {}) {
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
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }

  return data;
}

async function login(apiBaseUrl, role) {
  const credentials = getCredentials(role);
  if (!credentials.email || !credentials.password) {
    return {
      skipped: true,
      reason: `Missing SMOKE_${role.key}_EMAIL or SMOKE_${role.key}_PASSWORD`,
    };
  }

  const data = await request(apiBaseUrl, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  return {
    token: data?.token,
    user: data?.user,
  };
}

async function checkPublicCatalog(apiBaseUrl) {
  for (const endpoint of publicEndpoints) {
    await request(apiBaseUrl, endpoint);
    console.log(`OK public ${endpoint}`);
  }

  const books = await request(apiBaseUrl, "/api/books");
  const list = Array.isArray(books) ? books : Array.isArray(books?.items) ? books.items : [];
  const firstBook = list.find((book) => Number(book?.id) > 0);

  if (!firstBook) {
    console.log("SKIP book detail/reviews/reader access: no public book found");
    return;
  }

  const bookId = Number(firstBook.id);
  await request(apiBaseUrl, `/api/books/${bookId}`);
  await request(apiBaseUrl, `/api/books/${bookId}/reviews`);
  await request(apiBaseUrl, `/api/reader/books/${bookId}/access`);
  console.log(`OK book detail/review/reader access for book #${bookId}`);
}

async function checkRole(apiBaseUrl, role) {
  const session = await login(apiBaseUrl, role);

  if (session.skipped) {
    console.log(`SKIP ${role.label}: ${session.reason}`);
    return;
  }

  if (!session.token) {
    throw new Error(`${role.label}: login response did not include token`);
  }

  for (const endpoint of role.endpoints) {
    await request(apiBaseUrl, endpoint, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    console.log(`OK ${role.label} ${endpoint}`);
  }
}

async function main() {
  const apiBaseUrl = getApiBaseUrl();
  const failures = [];

  console.log(`Launch smoke API: ${apiBaseUrl}`);

  try {
    await checkPublicCatalog(apiBaseUrl);
  } catch (error) {
    failures.push(`public/catalog: ${error.message}`);
  }

  for (const role of roleChecks) {
    try {
      await checkRole(apiBaseUrl, role);
    } catch (error) {
      failures.push(`${role.label}: ${error.message}`);
    }
  }

  if (failures.length) {
    console.error("\nLaunch smoke test failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("\nLaunch smoke test passed.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
