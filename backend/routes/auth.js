const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fetch = global.fetch || require("node-fetch");
require("dotenv").config();

const ALLOWED_ROLES = ["user", "writer", "admin", "superadmin"];
const SOCIAL_PROVIDERS = ["facebook", "line"];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePassword(password) {
  return String(password || "");
}

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET_MISSING");
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function sanitizeUser(user, provider) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status || "active",
    provider,
  };
}

function getPublicApiUrl() {
  return process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL || "http://localhost:5173";
}

function encodeQuery(params) {
  return new URLSearchParams(params).toString();
}

function getOAuthRedirectUri(provider) {
  return `${getPublicApiUrl()}/api/auth/oauth/${provider}/callback`;
}

function createOAuthState(provider) {
  return jwt.sign(
    {
      provider,
      nonce: crypto.randomBytes(12).toString("hex"),
    },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );
}

function verifyOAuthState(state, provider) {
  const decoded = jwt.verify(state, process.env.JWT_SECRET);
  return decoded.provider === provider;
}

function getProviderConfig(provider) {
  const configs = {
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
      profileUrl: "https://graph.facebook.com/me",
      scope: "email,public_profile",
    },
    line: {
      clientId: process.env.LINE_CLIENT_ID,
      clientSecret: process.env.LINE_CLIENT_SECRET,
      authUrl: "https://access.line.me/oauth2/v2.1/authorize",
      tokenUrl: "https://api.line.me/oauth2/v2.1/token",
      profileUrl: "https://api.line.me/oauth2/v2.1/userinfo",
      scope: "openid profile email",
    },
  };

  const config = configs[provider];
  if (!config?.clientId || !config?.clientSecret) {
    return null;
  }

  return config;
}

function getProviderSetupStatus(provider) {
  const key = provider.toUpperCase();

  return {
    provider,
    configured:
      !!process.env[`${key}_CLIENT_ID`] &&
      !!process.env[`${key}_CLIENT_SECRET`],
    requiredEnv: [`${key}_CLIENT_ID`, `${key}_CLIENT_SECRET`],
    callbackUrl: getOAuthRedirectUri(provider),
  };
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data.error_description ||
      data.error?.message ||
      data.error ||
      "OAuth request failed";
    throw new Error(message);
  }

  return data;
}

async function exchangeOAuthCode(provider, code) {
  const config = getProviderConfig(provider);
  if (!config) {
    const envPrefix = provider.toUpperCase();
    throw new Error(
      `ยังไม่ได้ตั้งค่า ${envPrefix}_CLIENT_ID และ ${envPrefix}_CLIENT_SECRET ใน backend/.env`
    );
  }

  const redirectUri = getOAuthRedirectUri(provider);
  const tokenBody = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const tokenData = await fetchJson(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  });

  if (provider === "facebook") {
    const profile = await fetchJson(
      `${config.profileUrl}?${encodeQuery({
        fields: "id,name,email",
        access_token: tokenData.access_token,
      })}`
    );

    return {
      providerId: profile.id,
      name: profile.name || "Facebook User",
      email: profile.email || `facebook_${profile.id}@rv.local`,
    };
  }

  const profile = await fetchJson(config.profileUrl, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  return {
    providerId: profile.sub,
    name: profile.name || "LINE User",
    email: profile.email || `line_${profile.sub}@rv.local`,
  };
}

async function findOrCreateSocialUser(profile, provider) {
  const email = normalizeEmail(profile.email);
  const [existingUsers] = await db.query(
    `
    SELECT id, name, email, role, status, created_at, updated_at
    FROM users
    WHERE LOWER(TRIM(email)) = ?
    LIMIT 1
    `,
    [email]
  );

  if (existingUsers[0]) {
    return existingUsers[0];
  }

  const randomPassword = await bcrypt.hash(
    `${provider}:${profile.providerId}:${Date.now()}`,
    10
  );

  const [result] = await db.query(
    `
    INSERT INTO users (name, email, password, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `,
    [profile.name, email, randomPassword, "user", "active"]
  );

  const [createdUsers] = await db.query(
    `
    SELECT id, name, email, role, status, created_at, updated_at
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [result.insertId]
  );

  return createdUsers[0];
}

function redirectOAuthResult(res, payload) {
  const params = encodeQuery({
    token: payload.token,
    user: Buffer.from(JSON.stringify(payload.user), "utf8").toString("base64url"),
  });

  return res.redirect(`${getFrontendUrl()}/oauth/callback#${params}`);
}

function redirectOAuthError(res, message) {
  return res.redirect(
    `${getFrontendUrl()}/oauth/callback?${encodeQuery({ error: message })}`
  );
}

router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = normalizePassword(req.body.password);

    if (!name || !email || !password) {
      return res.status(400).json({ message: "กรอกข้อมูลไม่ครบ" });
    }

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `
      INSERT INTO users (name, email, password, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [name, email, hashedPassword, "user", "active"]
    );

    return res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = normalizePassword(req.body.password);

    if (!email || !password) {
      return res.status(400).json({ message: "กรอกอีเมลและรหัสผ่านให้ครบ" });
    }

    const [users] = await db.query(
      `
      SELECT id, name, email, password, role, status, created_at, updated_at
      FROM users
      WHERE LOWER(TRIM(email)) = ?
      LIMIT 1
      `,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const user = users[0];

    if (!ALLOWED_ROLES.includes(user.role)) {
      return res.status(403).json({
        message: "role นี้ไม่ได้รับอนุญาตให้ใช้งานระบบ",
      });
    }

    if (user.status && user.status !== "active") {
      return res.status(403).json({
        message: "บัญชีนี้ถูกระงับการใช้งาน",
      });
    }

    let isMatch = false;

    if (
      typeof user.password === "string" &&
      (user.password.startsWith("$2a$") ||
        user.password.startsWith("$2b$") ||
        user.password.startsWith("$2y$"))
    ) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = password === String(user.password || "");
    }

    if (!isMatch) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing in .env");
      return res.status(500).json({
        message: "ระบบยังไม่ได้ตั้งค่า JWT_SECRET",
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      token,
      user: sanitizeUser(user, "password"),
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
});

router.get("/oauth/status", (_req, res) => {
  return res.status(200).json({
    frontendUrl: getFrontendUrl(),
    apiPublicUrl: getPublicApiUrl(),
    providers: SOCIAL_PROVIDERS.map(getProviderSetupStatus),
  });
});

router.get("/oauth/:provider/start", (req, res) => {
  try {
    const provider = String(req.params.provider || "").toLowerCase();

    if (!SOCIAL_PROVIDERS.includes(provider)) {
      return res.status(400).json({ message: "provider ไม่ถูกต้อง" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "ระบบยังไม่ได้ตั้งค่า JWT_SECRET" });
    }

    const config = getProviderConfig(provider);
    if (!config) {
      const envPrefix = provider.toUpperCase();
      return redirectOAuthError(
        res,
        `ยังไม่ได้ตั้งค่า ${envPrefix}_CLIENT_ID และ ${envPrefix}_CLIENT_SECRET`
      );
    }

    const state = createOAuthState(provider);
    const params = {
      client_id: config.clientId,
      redirect_uri: getOAuthRedirectUri(provider),
      response_type: "code",
      scope: config.scope,
      state,
    };

    return res.redirect(`${config.authUrl}?${encodeQuery(params)}`);
  } catch (error) {
    console.error("OAUTH START ERROR:", error);
    return redirectOAuthError(res, "เริ่มเข้าสู่ระบบด้วย social network ไม่สำเร็จ");
  }
});

const handleOAuthCallback = async (req, res) => {
  const provider = String(req.params.provider || "").toLowerCase();
  const code = req.query.code || req.body.code;
  const state = req.query.state || req.body.state;
  const providerError = req.query.error || req.body.error;

  try {
    if (!SOCIAL_PROVIDERS.includes(provider)) {
      return redirectOAuthError(res, "provider ไม่ถูกต้อง");
    }

    if (providerError) {
      return redirectOAuthError(res, String(providerError));
    }

    if (!code || !state || !verifyOAuthState(state, provider)) {
      return redirectOAuthError(res, "ข้อมูล callback ไม่ถูกต้อง");
    }

    const profile = await exchangeOAuthCode(provider, String(code));
    const user = await findOrCreateSocialUser(profile, provider);

    if (!ALLOWED_ROLES.includes(user.role)) {
      return redirectOAuthError(res, "role นี้ไม่ได้รับอนุญาตให้ใช้งานระบบ");
    }

    if (user.status && user.status !== "active") {
      return redirectOAuthError(res, "บัญชีนี้ถูกระงับการใช้งาน");
    }

    const token = createToken(user);
    return redirectOAuthResult(res, {
      token,
      user: sanitizeUser(user, provider),
    });
  } catch (error) {
    console.error("OAUTH CALLBACK ERROR:", error);
    return redirectOAuthError(
      res,
      error.message || "เข้าสู่ระบบด้วย social network ไม่สำเร็จ"
    );
  }
};

router.get("/oauth/:provider/callback", handleOAuthCallback);
router.post("/oauth/:provider/callback", handleOAuthCallback);

router.post("/social-login", async (req, res) => {
  try {
    const provider = String(req.body.provider || "").trim().toLowerCase();
    const providerId = String(req.body.providerId || "demo").trim();
    const displayName = String(req.body.name || "").trim();
    const email = normalizeEmail(
      req.body.email || `${provider}.${providerId}@read-and-voice.local`
    );

    if (!SOCIAL_PROVIDERS.includes(provider)) {
      return res.status(400).json({ message: "provider ไม่ถูกต้อง" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing in .env");
      return res.status(500).json({
        message: "ระบบยังไม่ได้ตั้งค่า JWT_SECRET",
      });
    }

    const [existingUsers] = await db.query(
      `
      SELECT id, name, email, role, status, created_at, updated_at
      FROM users
      WHERE LOWER(TRIM(email)) = ?
      LIMIT 1
      `,
      [email]
    );

    let user = existingUsers[0];

    if (!user) {
      const fallbackName =
        displayName ||
        `${provider.charAt(0).toUpperCase()}${provider.slice(1)} User`;
      const randomPassword = await bcrypt.hash(
        `${provider}:${providerId}:${Date.now()}`,
        10
      );

      const [result] = await db.query(
        `
        INSERT INTO users (name, email, password, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `,
        [fallbackName, email, randomPassword, "user", "active"]
      );

      const [createdUsers] = await db.query(
        `
        SELECT id, name, email, role, status, created_at, updated_at
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [result.insertId]
      );

      user = createdUsers[0];
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      return res.status(403).json({
        message: "role นี้ไม่ได้รับอนุญาตให้ใช้งานระบบ",
      });
    }

    if (user.status && user.status !== "active") {
      return res.status(403).json({
        message: "บัญชีนี้ถูกระงับการใช้งาน",
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      token,
      user: sanitizeUser(user, provider),
    });
  } catch (error) {
    console.error("SOCIAL LOGIN ERROR:", error);
    return res.status(500).json({ message: "เกิดข้อผิดพลาดในระบบ" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "ไม่ได้ส่ง token" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "ระบบยังไม่ได้ตั้งค่า JWT_SECRET",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [users] = await db.query(
      `
      SELECT id, name, email, role, status, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    }

    return res.status(200).json({
      user: users[0],
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    return res.status(401).json({
      message: "token ไม่ถูกต้องหรือหมดอายุ",
    });
  }
});

module.exports = router;