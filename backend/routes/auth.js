const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../config/db");

const fetch = global.fetch || require("node-fetch");
require("dotenv").config({ quiet: true });

const router = express.Router();

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
    { expiresIn: "7d" },
  );
}

function sanitizeUser(user, provider = "password") {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status || "active",
    provider,
  };
}

async function ensurePasswordResetTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_password_reset_tokens_user (user_id),
      UNIQUE KEY uq_password_reset_tokens_hash (token_hash),
      CONSTRAINT fk_password_reset_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
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

function createOAuthState(provider, extra = {}) {
  return jwt.sign(
    {
      provider,
      nonce: crypto.randomBytes(12).toString("hex"),
      ...extra,
    },
    process.env.JWT_SECRET,
    { expiresIn: "10m" },
  );
}

function verifyOAuthState(state, provider) {
  const decoded = jwt.verify(state, process.env.JWT_SECRET);
  if (decoded.provider !== provider) {
    throw new Error("เธเนเธญเธกเธนเธฅ OAuth state เนเธกเนเธ•เธฃเธเธเธฑเธ provider");
  }
  return decoded;
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
      `ระบบ ${envPrefix} login ยังไม่พร้อมใช้งาน`,
    );
  }

  const tokenBody = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: getOAuthRedirectUri(provider),
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
      })}`,
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

async function ensureSocialConnectionsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS social_connections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      provider VARCHAR(40) NOT NULL,
      provider_user_id VARCHAR(191) NOT NULL,
      display_name VARCHAR(255) NULL,
      email VARCHAR(255) NULL,
      connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_social_connections_provider_user (provider, provider_user_id),
      UNIQUE KEY uq_social_connections_user_provider (user_id, provider),
      INDEX idx_social_connections_user (user_id),
      CONSTRAINT fk_social_connections_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

async function linkSocialConnection(userId, provider, profile) {
  await ensureSocialConnectionsTable();

  const [claimedRows] = await db.query(
    `SELECT user_id
     FROM social_connections
     WHERE provider = ? AND provider_user_id = ? AND user_id <> ?
     LIMIT 1`,
    [provider, profile.providerId, userId],
  );

  if (claimedRows.length > 0) {
    throw new Error("เธเธฑเธเธเธต social เธเธตเนเธ–เธนเธเน€เธเธทเนเธญเธกเธเธฑเธเธเธนเนเนเธเนเธญเธทเนเธเนเธฅเนเธง");
  }

  await db.query(
    `INSERT INTO social_connections
       (user_id, provider, provider_user_id, display_name, email, connected_at)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       provider_user_id = VALUES(provider_user_id),
       display_name = VALUES(display_name),
       email = VALUES(email),
       updated_at = NOW()`,
    [
      userId,
      provider,
      profile.providerId,
      profile.name || null,
      normalizeEmail(profile.email) || null,
    ],
  );
}

async function findOrCreateSocialUser(profile, provider) {
  const email = normalizeEmail(profile.email);
  const [existingUsers] = await db.query(
    `SELECT id, name, email, role, status, created_at, updated_at
     FROM users
     WHERE LOWER(TRIM(email)) = ?
     LIMIT 1`,
    [email],
  );

  if (existingUsers[0]) {
    await linkSocialConnection(existingUsers[0].id, provider, profile);
    return existingUsers[0];
  }

  const randomPassword = await bcrypt.hash(
    `${provider}:${profile.providerId}:${Date.now()}`,
    10,
  );

  const [result] = await db.query(
    `INSERT INTO users (name, email, password, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [profile.name, email, randomPassword, "user", "active"],
  );

  const [createdUsers] = await db.query(
    `SELECT id, name, email, role, status, created_at, updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [result.insertId],
  );

  await linkSocialConnection(result.insertId, provider, profile);
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
    `${getFrontendUrl()}/oauth/callback?${encodeQuery({ error: message })}`,
  );
}

function assertActiveUser(user) {
  if (!ALLOWED_ROLES.includes(user.role)) {
    throw new Error("role เธเธตเนเนเธกเนเนเธ”เนเธฃเธฑเธเธญเธเธธเธเธฒเธ•เนเธซเนเนเธเนเธเธฒเธเธฃเธฐเธเธ");
  }

  if (user.status && user.status !== "active") {
    throw new Error("เธเธฑเธเธเธตเธเธตเนเธ–เธนเธเธฃเธฐเธเธฑเธเธเธฒเธฃเนเธเนเธเธฒเธ");
  }
}

router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = normalizePassword(req.body.password);

    if (!name || !email || !password) {
      return res.status(400).json({ message: "เธเธฃเธญเธเธเนเธญเธกเธนเธฅเนเธซเนเธเธฃเธ" });
    }

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1",
      [email],
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "เธญเธตเน€เธกเธฅเธเธตเนเธ–เธนเธเนเธเนเธเธฒเธเนเธฅเนเธง" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (name, email, password, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [name, email, hashedPassword, "user", "active"],
    );

    return res.status(201).json({ message: "เธชเธกเธฑเธเธฃเธชเธกเธฒเธเธดเธเธชเธณเน€เธฃเนเธ" });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({ message: "เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เนเธเธฃเธฐเธเธ" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = normalizePassword(req.body.password);

    if (!email || !password) {
      return res.status(400).json({ message: "เธเธฃเธญเธเธญเธตเน€เธกเธฅเนเธฅเธฐเธฃเธซเธฑเธชเธเนเธฒเธเนเธซเนเธเธฃเธ" });
    }

    const [users] = await db.query(
      `SELECT id, name, email, password, role, status, created_at, updated_at
       FROM users
       WHERE LOWER(TRIM(email)) = ?
       LIMIT 1`,
      [email],
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "เธญเธตเน€เธกเธฅเธซเธฃเธทเธญเธฃเธซเธฑเธชเธเนเธฒเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ" });
    }

    const user = users[0];
    assertActiveUser(user);

    const passwordText = String(user.password || "");
    const isHashed =
      passwordText.startsWith("$2a$") ||
      passwordText.startsWith("$2b$") ||
      passwordText.startsWith("$2y$");
    const isMatch = isHashed
      ? await bcrypt.compare(password, passwordText)
      : password === passwordText;

    if (!isMatch) {
      return res.status(401).json({ message: "เธญเธตเน€เธกเธฅเธซเธฃเธทเธญเธฃเธซเธฑเธชเธเนเธฒเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ" });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธชเธณเน€เธฃเนเธ",
      token,
      user: sanitizeUser(user, "password"),
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: error.message || "เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เนเธเธฃเธฐเธเธ" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    await ensurePasswordResetTable();

    const [users] = await db.query(
      `SELECT id, email, status
       FROM users
       WHERE LOWER(TRIM(email)) = ?
       LIMIT 1`,
      [email],
    );

    if (users.length === 0) {
      return res.status(200).json({
        message:
          "If the account exists, a reset link has been prepared for that email.",
      });
    }

    const user = users[0];
    if (user.status && user.status !== "active") {
      return res.status(200).json({
        message:
          "If the account exists, a reset link has been prepared for that email.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = ?
         AND used_at IS NULL`,
      [user.id],
    );

    await db.query(
      `INSERT INTO password_reset_tokens
         (user_id, token_hash, expires_at, created_at)
       VALUES (?, ?, ?, NOW())`,
      [user.id, tokenHash, expiresAt],
    );

    const resetUrl = `${getFrontendUrl()}/forgot-password?token=${resetToken}`;

    return res.status(200).json({
      message:
        "Reset request created. Open the preview link below to choose a new password.",
      delivery: "preview",
      reset_url: resetUrl,
      expires_at: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({
      message: "Could not create password reset request",
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const token = String(req.body.token || "").trim();
    const password = normalizePassword(req.body.password);

    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    await ensurePasswordResetTable();

    const tokenHash = hashResetToken(token);
    const [tokens] = await db.query(
      `SELECT id, user_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token_hash = ?
       LIMIT 1`,
      [tokenHash],
    );

    if (tokens.length === 0) {
      return res.status(400).json({ message: "Reset token is invalid" });
    }

    const resetRow = tokens[0];
    const expired = new Date(resetRow.expires_at).getTime() < Date.now();

    if (resetRow.used_at || expired) {
      return res.status(400).json({ message: "Reset token has expired" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `UPDATE users
       SET password = ?, updated_at = NOW()
       WHERE id = ?`,
      [hashedPassword, resetRow.user_id],
    );

    await db.query(
      `UPDATE password_reset_tokens
       SET used_at = NOW()
       WHERE user_id = ?
         AND used_at IS NULL`,
      [resetRow.user_id],
    );

    return res.status(200).json({
      message: "Password reset completed successfully",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({
      message: "Could not reset password",
    });
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
    const mode = String(req.query.mode || "login").toLowerCase();

    if (!SOCIAL_PROVIDERS.includes(provider)) {
      return res.status(400).json({ message: "provider เนเธกเนเธ–เธนเธเธ•เนเธญเธ" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "เธฃเธฐเธเธเธขเธฑเธเนเธกเนเนเธ”เนเธ•เธฑเนเธเธเนเธฒ JWT_SECRET" });
    }

    const config = getProviderConfig(provider);
    if (!config) {
      const envPrefix = provider.toUpperCase();
      return redirectOAuthError(
        res,
        `เธขเธฑเธเนเธกเนเนเธ”เนเธ•เธฑเนเธเธเนเธฒ ${envPrefix}_CLIENT_ID เนเธฅเธฐ ${envPrefix}_CLIENT_SECRET`,
      );
    }

    let extraState = {};
    if (mode === "connect") {
      const token = String(req.query.token || "");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.id) {
        return redirectOAuthError(res, "เธเธฃเธธเธ“เธฒเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธเนเธญเธเน€เธเธทเนเธญเธกเธเธฑเธเธเธต social");
      }
      extraState = { mode: "connect", userId: decoded.id };
    }

    const state = createOAuthState(provider, extraState);
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
    return redirectOAuthError(
      res,
      error.message || "เน€เธฃเธดเนเธกเน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธ”เนเธงเธข social network เนเธกเนเธชเธณเน€เธฃเนเธ",
    );
  }
});

const handleOAuthCallback = async (req, res) => {
  const provider = String(req.params.provider || "").toLowerCase();
  const code = req.query.code || req.body.code;
  const state = req.query.state || req.body.state;
  const providerError = req.query.error || req.body.error;

  try {
    if (!SOCIAL_PROVIDERS.includes(provider)) {
      return redirectOAuthError(res, "provider เนเธกเนเธ–เธนเธเธ•เนเธญเธ");
    }

    if (providerError) {
      return redirectOAuthError(res, String(providerError));
    }

    if (!code || !state) {
      return redirectOAuthError(res, "เธเนเธญเธกเธนเธฅ callback เนเธกเนเธ–เธนเธเธ•เนเธญเธ");
    }

    const decodedState = verifyOAuthState(state, provider);
    const profile = await exchangeOAuthCode(provider, String(code));

    if (decodedState.mode === "connect" && decodedState.userId) {
      await linkSocialConnection(decodedState.userId, provider, profile);
      return res.redirect(
        `${getFrontendUrl()}/profile?${encodeQuery({ connected: provider })}`,
      );
    }

    const user = await findOrCreateSocialUser(profile, provider);
    assertActiveUser(user);

    const token = createToken(user);
    return redirectOAuthResult(res, {
      token,
      user: sanitizeUser(user, provider),
    });
  } catch (error) {
    console.error("OAUTH CALLBACK ERROR:", error);
    return redirectOAuthError(
      res,
      error.message || "เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธ”เนเธงเธข social network เนเธกเนเธชเธณเน€เธฃเนเธ",
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
      req.body.email || `${provider}.${providerId}@read-and-voice.local`,
    );

    if (!SOCIAL_PROVIDERS.includes(provider)) {
      return res.status(400).json({ message: "provider เนเธกเนเธ–เธนเธเธ•เนเธญเธ" });
    }

    const profile = {
      providerId,
      name:
        displayName ||
        `${provider.charAt(0).toUpperCase()}${provider.slice(1)} User`,
      email,
    };
    const user = await findOrCreateSocialUser(profile, provider);
    assertActiveUser(user);

    const token = createToken(user);

    return res.status(200).json({
      message: "เน€เธเนเธฒเธชเธนเนเธฃเธฐเธเธเธชเธณเน€เธฃเนเธ",
      token,
      user: sanitizeUser(user, provider),
    });
  } catch (error) {
    console.error("SOCIAL LOGIN ERROR:", error);
    return res.status(500).json({ message: error.message || "เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เนเธเธฃเธฐเธเธ" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "เนเธกเนเนเธ”เนเธชเนเธ token" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "เธฃเธฐเธเธเธขเธฑเธเนเธกเนเนเธ”เนเธ•เธฑเนเธเธเนเธฒ JWT_SECRET" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [users] = await db.query(
      `SELECT id, name, email, role, status, created_at, updated_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [decoded.id],
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "เนเธกเนเธเธเธเธนเนเนเธเนเธเธฒเธ" });
    }

    return res.status(200).json({ user: users[0] });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    return res.status(401).json({
      message: "token เนเธกเนเธ–เธนเธเธ•เนเธญเธเธซเธฃเธทเธญเธซเธกเธ”เธญเธฒเธขเธธ",
    });
  }
});

module.exports = router;
