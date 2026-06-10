require("dotenv").config({ quiet: true });

const DEFAULT_API_URL = "http://localhost:3000";

const roles = [
  {
    key: "USER",
    label: "user",
    endpoints: ["/api/auth/me", "/api/library/me", "/api/cart", "/api/orders/history", "/api/coins/wallet"],
  },
  {
    key: "WRITER",
    label: "writer",
    endpoints: ["/api/auth/me", "/api/writer/books/mine", "/api/writers/me/profile"],
  },
  {
    key: "ADMIN",
    label: "admin",
    endpoints: ["/api/auth/me", "/api/admin/stats/summary", "/api/admin/books/pending", "/api/support/tickets"],
  },
  {
    key: "SUPERADMIN",
    label: "superadmin",
    endpoints: ["/api/auth/me", "/api/admin/users", "/api/admin/stats/summary", "/api/admin/password-resets"],
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

async function request(url, options = {}) {
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

  const data = await request(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  return {
    token: data?.token,
    user: data?.user,
  };
}

async function checkEndpoint(apiBaseUrl, endpoint, token) {
  await request(`${apiBaseUrl}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function main() {
  const apiBaseUrl = getApiBaseUrl();
  const failures = [];

  console.log(`Smoke API: ${apiBaseUrl}`);

  await request(`${apiBaseUrl}/api`);
  console.log("OK public API");

  for (const role of roles) {
    try {
      const session = await login(apiBaseUrl, role);

      if (session.skipped) {
        console.log(`SKIP ${role.label}: ${session.reason}`);
        continue;
      }

      if (!session.token) {
        throw new Error("login response did not include token");
      }

      for (const endpoint of role.endpoints) {
        await checkEndpoint(apiBaseUrl, endpoint, session.token);
      }

      console.log(`OK ${role.label}`);
    } catch (error) {
      failures.push(`${role.label}: ${error.message}`);
      console.error(`FAIL ${role.label}: ${error.message}`);
    }
  }

  if (failures.length) {
    console.error("\nSmoke test failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
