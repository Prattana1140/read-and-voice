const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../config/db");

const fetch = global.fetch || require("node-fetch");
require("dotenv").config({ quiet: true });

const router = express.Router();

const ALLOWED_ROLES = ["user", "writer", "admin", "superadmin"];
const SOCIAL_PROVIDERS = ["line"];
const DEFAULT_FACEBOOK_API_VERSION = "v25.0";

let userProfilesTableReady;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePassword(password) {
  return String(password || "");
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function isPlaceholderValue(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return true;

  return (
    ["x", "xx", "xxx", "xxxx", "xxxxx", "changeme", "change-me"].includes(text) ||
    text.includes("change-this") ||
    text.includes("your-") ||
    text.includes("your_") ||
    text.includes("example")
  );
}

function isUsableConfigValue(value) {
  return !isPlaceholderValue(value);
}

function normalizeFacebookApiVersion(version) {
  const raw = String(version || DEFAULT_FACEBOOK_API_VERSION).trim();
  if (!raw) return DEFAULT_FACEBOOK_API_VERSION;
  return raw.startsWith("v") ? raw : `v${raw}`;
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

async function ensureUserProfilesTable() {
  if (!userProfilesTableReady) {
    userProfilesTableReady = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          user_id INT PRIMARY KEY,
          avatar_url TEXT NULL,
          phone VARCHAR(50) NULL,
          bio TEXT NULL,
          accessibility_mode TINYINT(1) NOT NULL DEFAULT 0,
          visual_impairment_verified TINYINT(1) NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

        try {
          await db.query(
            "ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT NULL FIRST",
          );
        } catch (error) {
          if (error.code !== "ER_DUP_FIELDNAME") throw error;
        }
        try {
          await db.query(
            "ALTER TABLE user_profiles ADD COLUMN accessibility_mode TINYINT(1) NOT NULL DEFAULT 0 AFTER bio",
          );
        } catch (error) {
          if (error.code !== "ER_DUP_FIELDNAME") throw error;
        }
        try {
          await db.query(
            "ALTER TABLE user_profiles ADD COLUMN visual_impairment_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER accessibility_mode",
          );
        } catch (error) {
          if (error.code !== "ER_DUP_FIELDNAME") throw error;
        }
      })();
  }

  return userProfilesTableReady;
}

async function setAccessibilityMode(userId, enabled) {
  await ensureUserProfilesTable();
  await db.query(
    `INSERT INTO user_profiles (user_id, accessibility_mode)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE
       accessibility_mode = VALUES(accessibility_mode),
       updated_at = NOW()`,
    [userId, enabled ? 1 : 0],
  );
}

async function hydrateUser(user) {
  await ensureUserProfilesTable();
  const [rows] = await db.query(
    `SELECT avatar_url, accessibility_mode, visual_impairment_verified
     FROM user_profiles
     WHERE user_id = ?
     LIMIT 1`,
    [user.id],
  );

  return {
    ...user,
    avatar_url: rows[0]?.avatar_url || user.avatar_url || null,
    accessibility_mode: Number(rows[0]?.accessibility_mode || 0) === 1,
    visual_impairment_verified: Number(rows[0]?.visual_impairment_verified || 0) === 1,
  };
}

function sanitizeUser(user, provider = "password") {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status || "active",
    provider,
    avatar_url: user.avatar_url || null,
    accessibility_mode: Boolean(user.accessibility_mode),
    accessibility_label: Boolean(user.accessibility_mode)
      ? "visual_assist"
      : "standard",
    visual_impairment_verified: Boolean(user.visual_impairment_verified),
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
  const payload = {
    provider,
    nonce: crypto.randomBytes(12).toString("hex"),
    ...extra,
  };

  return {
    value: jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "10m" }),
    nonce: payload.nonce,
  };
}

function verifyOAuthState(state, provider) {
  const decoded = jwt.verify(state, process.env.JWT_SECRET);
  if (decoded.provider !== provider) {
    throw new Error("OAuth state does not match the selected provider");
  }
  return decoded;
}

function getProviderConfig(provider) {
  const config = getProviderDefinition(provider);
  if (!config) return null;

  const status = getProviderSetupStatus(provider);
  if (!status.configured) return null;

  return config;
}

function getProviderDefinition(provider) {
  const facebookApiVersion = normalizeFacebookApiVersion(
    readEnv("FACEBOOK_API_VERSION"),
  );

  const configs = {
    line: {
      provider: "line",
      clientId: readEnv("LINE_CLIENT_ID"),
      clientSecret: readEnv("LINE_CLIENT_SECRET"),
      authUrl:
        readEnv("LINE_AUTH_URL") ||
        "https://access.line.me/oauth2/v2.1/authorize",
      tokenUrl:
        readEnv("LINE_TOKEN_URL") ||
        "https://api.line.me/oauth2/v2.1/token",
      profileUrl:
        readEnv("LINE_PROFILE_URL") || "https://api.line.me/v2/profile",
      userInfoUrl:
        readEnv("LINE_USERINFO_URL") ||
        "https://api.line.me/oauth2/v2.1/userinfo",
      verifyAccessTokenUrl:
        readEnv("LINE_VERIFY_ACCESS_TOKEN_URL") ||
        "https://api.line.me/oauth2/v2.1/verify",
      verifyIdTokenUrl:
        readEnv("LINE_VERIFY_ID_TOKEN_URL") ||
        "https://api.line.me/oauth2/v2.1/verify",
      scope: readEnv("LINE_SCOPE") || "openid profile email",
      requiredEnv: ["LINE_CLIENT_ID", "LINE_CLIENT_SECRET"],
    },
    facebook: {
      provider: "facebook",
      clientId: readEnv("FACEBOOK_CLIENT_ID"),
      clientSecret: readEnv("FACEBOOK_CLIENT_SECRET"),
      authUrl:
        readEnv("FACEBOOK_AUTH_URL") ||
        `https://www.facebook.com/${facebookApiVersion}/dialog/oauth`,
      tokenUrl:
        readEnv("FACEBOOK_TOKEN_URL") ||
        `https://graph.facebook.com/${facebookApiVersion}/oauth/access_token`,
      profileUrl:
        readEnv("FACEBOOK_PROFILE_URL") ||
        `https://graph.facebook.com/${facebookApiVersion}/me`,
      debugTokenUrl:
        readEnv("FACEBOOK_DEBUG_TOKEN_URL") ||
        `https://graph.facebook.com/${facebookApiVersion}/debug_token`,
      scope: readEnv("FACEBOOK_SCOPE") || "public_profile,email",
      profileFields:
        readEnv("FACEBOOK_PROFILE_FIELDS") ||
        "id,name,email,picture.type(large)",
      apiVersion: facebookApiVersion,
      requiredEnv: ["FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"],
    },
  };

  return configs[provider] || null;
}

function getProviderConfigProblems(provider, config) {
  const problems = [];

  if (!config) {
    problems.push("provider is not supported");
    return problems;
  }

  for (const envName of config.requiredEnv || []) {
    if (!isUsableConfigValue(process.env[envName])) {
      problems.push(`${envName} is missing or still uses a placeholder value`);
    }
  }

  if (provider === "line" && config.clientId && !/^\d+$/.test(config.clientId)) {
    problems.push("LINE_CLIENT_ID must be the numeric LINE Login Channel ID");
  }

  if (
    provider === "facebook" &&
    config.clientId &&
    !/^\d+$/.test(config.clientId)
  ) {
    problems.push("FACEBOOK_CLIENT_ID must be the numeric Facebook App ID");
  }

  return problems;
}

function getProviderSetupStatus(provider) {
  const config = getProviderDefinition(provider);
  const problems = getProviderConfigProblems(provider, config);

  return {
    provider,
    configured: problems.length === 0,
    requiredEnv: config?.requiredEnv || [],
    problems,
    callbackUrl: getOAuthRedirectUri(provider),
    authUrl: config?.authUrl || null,
    scope: config?.scope || null,
    apiVersion: config?.apiVersion || null,
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

function createFacebookAppSecretProof(accessToken, clientSecret) {
  return crypto
    .createHmac("sha256", clientSecret)
    .update(accessToken)
    .digest("hex");
}

function base64UrlDecode(value) {
  const text = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = text.padEnd(
    text.length + ((4 - (text.length % 4)) % 4),
    "=",
  );
  return Buffer.from(padded, "base64");
}

function parseFacebookSignedRequest(signedRequest, appSecret) {
  const [encodedSignature, encodedPayload] = String(signedRequest || "").split(
    ".",
    2,
  );

  if (!encodedSignature || !encodedPayload) {
    throw createHttpError(400, "Invalid Facebook signed_request");
  }

  const signature = base64UrlDecode(encodedSignature);
  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(encodedPayload)
    .digest();

  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(signature, expectedSignature)
  ) {
    throw createHttpError(400, "Invalid Facebook signed_request signature");
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8"));

  if (payload.algorithm && payload.algorithm.toUpperCase() !== "HMAC-SHA256") {
    throw createHttpError(400, "Unsupported Facebook signed_request algorithm");
  }

  return payload;
}

async function exchangeOAuthCode(provider, code, decodedState = {}) {
  const config = getProviderConfig(provider);
  if (!config) {
    const status = getProviderSetupStatus(provider);
    throw new Error(
      `${provider.toUpperCase()} login ยังไม่พร้อมใช้งาน: ${status.problems.join("; ")}`,
    );
  }

  let tokenData;

  if (provider === "facebook") {
    const tokenParams = {
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: getOAuthRedirectUri(provider),
    };

    tokenData = await fetchJson(`${config.tokenUrl}?${encodeQuery(tokenParams)}`);
  } else {
    const tokenBody = new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: getOAuthRedirectUri(provider),
      grant_type: "authorization_code",
    });

    tokenData = await fetchJson(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody,
    });
  }

  return fetchProviderProfile(provider, config, tokenData, decodedState);
}

async function fetchProviderProfile(provider, config, tokenData, decodedState = {}) {
  if (!tokenData?.access_token && !tokenData?.id_token) {
    throw new Error("OAuth provider did not return a usable access token");
  }

  if (provider === "line") {
    return fetchLineProfile(config, tokenData, decodedState);
  }

  if (provider === "facebook") {
    if (!tokenData.access_token) {
      throw new Error("Facebook social login requires an access token");
    }

    return fetchFacebookProfile(config, tokenData.access_token, {
      verifyToken: Boolean(decodedState.verifyProviderToken),
    });
  }

  throw new Error("Unsupported OAuth provider");
}

async function verifyLineAccessToken(config, accessToken) {
  const verification = await fetchJson(
    `${config.verifyAccessTokenUrl}?${encodeQuery({ access_token: accessToken })}`,
  );

  if (String(verification.client_id || "") !== String(config.clientId)) {
    throw new Error("LINE access token was not issued for this app");
  }

  return verification;
}

async function verifyLineIdToken(config, idToken, nonce) {
  const body = new URLSearchParams({
    id_token: idToken,
    client_id: config.clientId,
  });

  if (nonce) {
    body.set("nonce", nonce);
  }

  return fetchJson(config.verifyIdTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

async function fetchLineProfile(config, tokenData, decodedState = {}) {
  let idTokenProfile = null;
  let lineProfile = null;

  if (tokenData.id_token) {
    idTokenProfile = await verifyLineIdToken(
      config,
      tokenData.id_token,
      decodedState.nonce,
    );
  }

  if (tokenData.access_token) {
    await verifyLineAccessToken(config, tokenData.access_token);

    try {
      lineProfile = await fetchJson(config.userInfoUrl, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
    } catch (error) {
      lineProfile = await fetchJson(config.profileUrl, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
    }
  }

  const providerId = idTokenProfile?.sub || lineProfile?.sub || lineProfile?.userId;

  if (!providerId) {
    throw new Error("LINE profile did not include a user id");
  }

  return {
    providerId,
    name:
      idTokenProfile?.name ||
      lineProfile?.name ||
      lineProfile?.displayName ||
      "LINE User",
    email: normalizeEmail(idTokenProfile?.email || lineProfile?.email),
    avatarUrl:
      idTokenProfile?.picture ||
      lineProfile?.picture ||
      lineProfile?.pictureUrl ||
      null,
  };
}

async function verifyFacebookAccessToken(config, accessToken) {
  const appAccessToken = `${config.clientId}|${config.clientSecret}`;
  const tokenInfo = await fetchJson(
    `${config.debugTokenUrl}?${encodeQuery({
      input_token: accessToken,
      access_token: appAccessToken,
    })}`,
  );

  if (!tokenInfo?.data?.is_valid) {
    throw new Error("Facebook access token is invalid");
  }

  if (String(tokenInfo.data.app_id || "") !== String(config.clientId)) {
    throw new Error("Facebook access token was not issued for this app");
  }

  return tokenInfo.data;
}

async function fetchFacebookProfile(config, accessToken, options = {}) {
  if (options.verifyToken) {
    await verifyFacebookAccessToken(config, accessToken);
  }

  const params = {
    fields: config.profileFields,
    access_token: accessToken,
    appsecret_proof: createFacebookAppSecretProof(
      accessToken,
      config.clientSecret,
    ),
  };

  const profile = await fetchJson(`${config.profileUrl}?${encodeQuery(params)}`);
  const providerId = profile.id;

  if (!providerId) {
    throw new Error("Facebook profile did not include a user id");
  }

  return {
    providerId,
    name: profile.name || "Facebook User",
    email: normalizeEmail(profile.email),
    avatarUrl: profile.picture?.data?.url || null,
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
      avatar_url TEXT NULL,
      connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_social_connections_provider_user (provider, provider_user_id),
      UNIQUE KEY uq_social_connections_user_provider (user_id, provider),
      INDEX idx_social_connections_user (user_id),
      CONSTRAINT fk_social_connections_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  try {
    await db.query(
      "ALTER TABLE social_connections ADD COLUMN avatar_url TEXT NULL AFTER email",
    );
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }
}

async function ensureLoginEventsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS login_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      provider VARCHAR(40) NOT NULL,
      provider_user_id VARCHAR(191) NULL,
      success TINYINT(1) NOT NULL DEFAULT 0,
      ip_address VARCHAR(45) NULL,
      user_agent TEXT NULL,
      message VARCHAR(255) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_login_events_user (user_id),
      INDEX idx_login_events_provider (provider, provider_user_id),
      INDEX idx_login_events_created_at (created_at),
      CONSTRAINT fk_login_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureDataDeletionRequestsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS data_deletion_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      provider VARCHAR(40) NOT NULL,
      provider_user_id VARCHAR(191) NOT NULL,
      confirmation_code VARCHAR(80) NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'completed',
      requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME NULL,
      UNIQUE KEY uq_data_deletion_confirmation (confirmation_code),
      INDEX idx_data_deletion_provider_user (provider, provider_user_id),
      INDEX idx_data_deletion_user (user_id),
      CONSTRAINT fk_data_deletion_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function getRequestIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const rawIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor || req.ip || req.socket?.remoteAddress || "";

  return String(rawIp).split(",")[0].trim().slice(0, 45) || null;
}

async function recordLoginEvent(req, event) {
  try {
    await ensureLoginEventsTable();
    await db.query(
      `INSERT INTO login_events
         (user_id, provider, provider_user_id, success, ip_address, user_agent, message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        event.userId || null,
        event.provider || "password",
        event.providerUserId || null,
        event.success ? 1 : 0,
        getRequestIp(req),
        String(req.headers["user-agent"] || "").slice(0, 1000) || null,
        event.message ? String(event.message).slice(0, 255) : null,
      ],
    );
  } catch (error) {
    console.error("LOGIN EVENT ERROR:", error.message);
  }
}

async function deleteFacebookDerivedData(providerUserId) {
  await ensureSocialConnectionsTable();
  await ensureDataDeletionRequestsTable();

  const [connections] = await db.query(
    `SELECT user_id
     FROM social_connections
     WHERE provider = 'facebook'
       AND provider_user_id = ?
     LIMIT 1`,
    [providerUserId],
  );
  const userId = connections[0]?.user_id || null;

  await db.query(
    `DELETE FROM social_connections
     WHERE provider = 'facebook'
       AND provider_user_id = ?`,
    [providerUserId],
  );

  if (userId) {
    await ensureUserProfilesTable();
    await db.query(
      `UPDATE user_profiles
       SET avatar_url = NULL,
           updated_at = NOW()
       WHERE user_id = ?`,
      [userId],
    );
  }

  const confirmationCode = crypto.randomBytes(16).toString("hex");
  await db.query(
    `INSERT INTO data_deletion_requests
       (user_id, provider, provider_user_id, confirmation_code, status, completed_at)
     VALUES (?, 'facebook', ?, ?, 'completed', NOW())`,
    [userId, providerUserId, confirmationCode],
  );

  return confirmationCode;
}

async function saveUserAvatar(userId, avatarUrl) {
  if (!avatarUrl) return;

  await ensureUserProfilesTable();
  await db.query(
    `INSERT INTO user_profiles (user_id, avatar_url)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE
       avatar_url = VALUES(avatar_url),
       updated_at = NOW()`,
    [userId, avatarUrl],
  );
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
    throw new Error("This social account is already linked to another user");
  }

  await db.query(
    `INSERT INTO social_connections
       (user_id, provider, provider_user_id, display_name, email, avatar_url, connected_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       provider_user_id = VALUES(provider_user_id),
       display_name = VALUES(display_name),
       email = VALUES(email),
       avatar_url = VALUES(avatar_url),
       updated_at = NOW()`,
    [
      userId,
      provider,
      profile.providerId,
      profile.name || null,
      normalizeEmail(profile.email) || null,
      profile.avatarUrl || null,
    ],
  );

  await saveUserAvatar(userId, profile.avatarUrl);
}

function getLocalSocialEmail(provider, providerId) {
  const safeProviderId = String(providerId || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  if (safeProviderId) {
    return `${provider}.${safeProviderId}@read-and-voice.local`;
  }

  const hash = crypto
    .createHash("sha256")
    .update(`${provider}:${providerId}`)
    .digest("hex")
    .slice(0, 24);

  return `${provider}.${hash}@read-and-voice.local`;
}

function isLocalSocialEmail(email) {
  return normalizeEmail(email).endsWith("@read-and-voice.local");
}

async function updateSyntheticEmailIfPossible(user, realEmail) {
  const email = normalizeEmail(realEmail);
  if (!email || !isLocalSocialEmail(user.email)) {
    return user;
  }

  const [existingUsers] = await db.query(
    `SELECT id
     FROM users
     WHERE LOWER(TRIM(email)) = ?
       AND id <> ?
     LIMIT 1`,
    [email, user.id],
  );

  if (existingUsers.length > 0) {
    return user;
  }

  await db.query("UPDATE users SET email = ?, updated_at = NOW() WHERE id = ?", [
    email,
    user.id,
  ]);

  return { ...user, email };
}

async function findOrCreateSocialUser(profile, provider) {
  if (!profile.providerId) {
    throw new Error("Social profile is missing provider id");
  }

  await ensureSocialConnectionsTable();

  const [connectedUsers] = await db.query(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, u.updated_at
     FROM social_connections sc
     JOIN users u ON u.id = sc.user_id
     WHERE sc.provider = ?
       AND sc.provider_user_id = ?
     LIMIT 1`,
    [provider, profile.providerId],
  );

  if (connectedUsers[0]) {
    const updatedUser = await updateSyntheticEmailIfPossible(
      connectedUsers[0],
      profile.email,
    );
    await linkSocialConnection(updatedUser.id, provider, profile);
    return hydrateUser(updatedUser);
  }

  const email = normalizeEmail(profile.email);

  if (email) {
    const [existingUsers] = await db.query(
      `SELECT id, name, email, role, status, created_at, updated_at
       FROM users
       WHERE LOWER(TRIM(email)) = ?
       LIMIT 1`,
      [email],
    );

    if (existingUsers[0]) {
      await linkSocialConnection(existingUsers[0].id, provider, profile);
      return hydrateUser(existingUsers[0]);
    }
  }

  const randomPassword = await bcrypt.hash(
    `${provider}:${profile.providerId}:${Date.now()}`,
    10,
  );
  const accountEmail = email || getLocalSocialEmail(provider, profile.providerId);

  const [result] = await db.query(
    `INSERT INTO users (name, email, password, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
    [profile.name, accountEmail, randomPassword, "user", "active"],
  );

  const [createdUsers] = await db.query(
    `SELECT id, name, email, role, status, created_at, updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [result.insertId],
  );

  await linkSocialConnection(result.insertId, provider, profile);
  return hydrateUser(createdUsers[0]);
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
    throw createHttpError(403, "role นี้ยังไม่ได้รับอนุญาตให้ใช้งานระบบ");
  }

  if (user.status && user.status !== "active") {
    throw createHttpError(403, "บัญชีนี้ถูกระงับการใช้งาน");
  }
}

router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = normalizePassword(req.body.password);
    const accessibilityMode = Boolean(req.body.accessibility_mode);

    if (!name || !email || !password) {
      return res.status(400).json({ message: "กรอกข้อมูลให้ครบ" });
    }

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1",
      [email],
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users (name, email, password, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [name, email, hashedPassword, "user", "active"],
    );

    await setAccessibilityMode(result.insertId, accessibilityMode);

    return res.status(201).json({ message: "สมัครสมาชิกสำเร็จ" });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(error.status || 500).json({
      message: error.message || "เกิดข้อผิดพลาดในระบบ",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = normalizePassword(req.body.password);
    const accessibilityMode = Boolean(req.body.accessibility_mode);

    if (!email || !password) {
      return res.status(400).json({ message: "กรอกอีเมลและรหัสผ่านให้ครบ" });
    }

    const [users] = await db.query(
      `SELECT id, name, email, password, role, status, created_at, updated_at
       FROM users
       WHERE LOWER(TRIM(email)) = ?
       LIMIT 1`,
      [email],
    );

    if (users.length === 0) {
      await recordLoginEvent(req, {
        provider: "password",
        success: false,
        message: "user_not_found",
      });
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
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
      await recordLoginEvent(req, {
        userId: user.id,
        provider: "password",
        success: false,
        message: "invalid_password",
      });
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    await setAccessibilityMode(user.id, accessibilityMode);
    const hydratedUser = await hydrateUser(user);
    const token = createToken(hydratedUser);
    await recordLoginEvent(req, {
      userId: hydratedUser.id,
      provider: "password",
      success: true,
      message: "login_success",
    });

    return res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      token,
      user: sanitizeUser(hydratedUser, "password"),
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(error.status || 500).json({
      message: error.message || "เกิดข้อผิดพลาดในระบบ",
    });
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

router.get("/facebook/data-deletion", (_req, res) => {
  return res.status(200).json({
    app: "Read and Voice",
    provider: "facebook",
    message:
      "Facebook data deletion callback is active. Meta should send POST requests with signed_request to this URL.",
  });
});

router.get("/facebook/data-deletion/status/:code", async (req, res) => {
  try {
    await ensureDataDeletionRequestsTable();
    const [rows] = await db.query(
      `SELECT provider, status, requested_at, completed_at
       FROM data_deletion_requests
       WHERE confirmation_code = ?
       LIMIT 1`,
      [String(req.params.code || "").trim()],
    );

    if (rows.length === 0) {
      return res.status(404).json({ status: "not_found" });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error("FACEBOOK DATA DELETION STATUS ERROR:", error);
    return res.status(500).json({ message: "Could not load deletion status" });
  }
});

router.post("/facebook/data-deletion", async (req, res) => {
  try {
    const appSecret = readEnv("FACEBOOK_CLIENT_SECRET");
    if (!isUsableConfigValue(appSecret)) {
      return res.status(503).json({
        message: "FACEBOOK_CLIENT_SECRET is not configured",
      });
    }

    const signedRequest = req.body.signed_request;
    if (!signedRequest) {
      return res.status(400).json({ message: "signed_request is required" });
    }

    const payload = parseFacebookSignedRequest(signedRequest, appSecret);
    const providerUserId = String(payload.user_id || "").trim();

    if (!providerUserId) {
      return res.status(400).json({
        message: "Facebook signed_request did not include user_id",
      });
    }

    const confirmationCode = await deleteFacebookDerivedData(providerUserId);

    return res.status(200).json({
      url: `${getPublicApiUrl()}/api/auth/facebook/data-deletion/status/${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error("FACEBOOK DATA DELETION ERROR:", error);
    return res.status(error.status || 500).json({
      message: error.message || "Could not process Facebook data deletion",
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
    const rawMode = String(req.query.mode || "login").toLowerCase();
    const mode = rawMode === "connect" ? "connect" : "login";
    const rawExperienceMode = String(
      req.query.experience_mode ||
        req.query.accessibility_mode ||
        (rawMode === "visual_assist" ? rawMode : "standard"),
    ).toLowerCase();
    const experienceMode =
      ["1", "true", "yes", "visual_assist", "accessibility"].includes(
        rawExperienceMode,
      )
        ? "visual_assist"
        : "standard";

    if (!SOCIAL_PROVIDERS.includes(provider)) {
      return res.status(400).json({ message: "provider ไม่ถูกต้อง" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET is not configured" });
    }

    const config = getProviderConfig(provider);
    if (!config) {
      const envPrefix = provider.toUpperCase();
      return redirectOAuthError(
        res,
        `${envPrefix} OAuth settings are not fully configured`,
      );
    }

    let extraState = { experienceMode };
    if (mode === "connect") {
      const token = String(req.query.token || "");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!decoded?.id) {
        return redirectOAuthError(res, "Please sign in before connecting a social account");
      }
      extraState = { mode: "connect", userId: decoded.id, experienceMode };
    }

    const signedState = createOAuthState(provider, extraState);
    const params = {
      client_id: config.clientId,
      redirect_uri: getOAuthRedirectUri(provider),
      response_type: "code",
      scope: config.scope,
      state: signedState.value,
    };

    if (provider === "line" && config.scope.split(/\s+/).includes("openid")) {
      params.nonce = signedState.nonce;
    }

    return res.redirect(`${config.authUrl}?${encodeQuery(params)}`);
  } catch (error) {
    console.error("OAUTH START ERROR:", error);
    return redirectOAuthError(
      res,
      error.message || "Unable to start social login",
    );
  }
});

const handleOAuthCallback = async (req, res) => {
  const provider = String(req.params.provider || "").toLowerCase();
  const code = req.query.code || req.body?.code;
  const state = req.query.state || req.body?.state;
  const providerError = req.query.error || req.body?.error;

  try {
    if (!SOCIAL_PROVIDERS.includes(provider)) {
      return redirectOAuthError(res, "Invalid provider");
    }

    if (providerError) {
      return redirectOAuthError(res, String(providerError));
    }

    if (!code || !state) {
      return redirectOAuthError(res, "Invalid callback data");
    }

    const decodedState = verifyOAuthState(state, provider);
    const profile = await exchangeOAuthCode(provider, String(code), decodedState);

    if (decodedState.mode === "connect" && decodedState.userId) {
      await linkSocialConnection(decodedState.userId, provider, profile);
      await recordLoginEvent(req, {
        userId: decodedState.userId,
        provider,
        providerUserId: profile.providerId,
        success: true,
        message: "social_connect_success",
      });
      return res.redirect(
        `${getFrontendUrl()}/profile?${encodeQuery({ connected: provider })}`,
      );
    }

    const user = await findOrCreateSocialUser(profile, provider);
    assertActiveUser(user);

    await setAccessibilityMode(
      user.id,
      decodedState.experienceMode === "visual_assist",
    );
    const hydratedUser = await hydrateUser(user);
    const token = createToken(hydratedUser);
    await recordLoginEvent(req, {
      userId: hydratedUser.id,
      provider,
      providerUserId: profile.providerId,
      success: true,
      message: "social_login_success",
    });
    return redirectOAuthResult(res, {
      token,
      user: sanitizeUser(hydratedUser, provider),
    });
  } catch (error) {
    console.error("OAUTH CALLBACK ERROR:", error);
    await recordLoginEvent(req, {
      provider,
      success: false,
      message: error.message || "oauth_callback_failed",
    });
    return redirectOAuthError(
      res,
      error.message || "Unable to complete social login",
    );
  }
};

router.get("/oauth/:provider/callback", handleOAuthCallback);
router.post("/oauth/:provider/callback", handleOAuthCallback);

router.post("/social-login", async (req, res) => {
  let provider = "unknown";

  try {
    provider = String(req.body.provider || "").trim().toLowerCase();
    const accessibilityMode = Boolean(req.body.accessibility_mode);
    const accessToken = String(
      req.body.access_token || req.body.accessToken || "",
    ).trim();
    const idToken = String(req.body.id_token || req.body.idToken || "").trim();
    const nonce = String(req.body.nonce || "").trim();

    if (!SOCIAL_PROVIDERS.includes(provider)) {
      return res.status(400).json({ message: "Invalid provider" });
    }

    if (!accessToken && !idToken) {
      if (process.env.ALLOW_UNVERIFIED_SOCIAL_LOGIN === "true") {
        const providerId = String(req.body.providerId || "").trim();
        const displayName = String(req.body.name || "").trim();
        if (!providerId) {
          return res.status(400).json({
            message: "providerId is required for unverified social login",
          });
        }

        const demoProfile = {
          providerId,
          name:
            displayName ||
            `${provider.charAt(0).toUpperCase()}${provider.slice(1)} User`,
          email: normalizeEmail(req.body.email),
          avatarUrl: req.body.avatar_url || req.body.avatarUrl || null,
        };
        const user = await findOrCreateSocialUser(demoProfile, provider);
        assertActiveUser(user);

        await setAccessibilityMode(user.id, accessibilityMode);
        const hydratedUser = await hydrateUser(user);
        const token = createToken(hydratedUser);
        await recordLoginEvent(req, {
          userId: hydratedUser.id,
          provider,
          providerUserId: demoProfile.providerId,
          success: true,
          message: "unverified_social_login_success",
        });

        return res.status(200).json({
          message: "เข้าสู่ระบบสำเร็จ",
          token,
          user: sanitizeUser(hydratedUser, provider),
        });
      }

      return res.status(400).json({
        message:
          "Social login ต้องใช้ access_token/id_token จาก provider หรือเริ่มที่ /api/auth/oauth/:provider/start",
      });
    }

    const config = getProviderConfig(provider);
    if (!config) {
      const status = getProviderSetupStatus(provider);
      return res.status(503).json({
        message: `${provider.toUpperCase()} login ยังไม่พร้อมใช้งาน`,
        problems: status.problems,
      });
    }

    const profile = await fetchProviderProfile(
      provider,
      config,
      {
        access_token: accessToken,
        id_token: idToken,
      },
      { nonce, verifyProviderToken: true },
    );
    const user = await findOrCreateSocialUser(profile, provider);
    assertActiveUser(user);

    await setAccessibilityMode(user.id, accessibilityMode);
    const hydratedUser = await hydrateUser(user);
    const token = createToken(hydratedUser);
    await recordLoginEvent(req, {
      userId: hydratedUser.id,
      provider,
      providerUserId: profile.providerId,
      success: true,
      message: "social_token_login_success",
    });

    return res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      token,
      user: sanitizeUser(hydratedUser, provider),
    });
  } catch (error) {
    console.error("SOCIAL LOGIN ERROR:", error);
    await recordLoginEvent(req, {
      provider,
      success: false,
      message: error.message || "social_login_failed",
    });
    return res.status(error.status || 500).json({
      message: error.message || "เกิดข้อผิดพลาดในระบบ",
    });
  }
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "ไม่พบ token" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "ระบบยังไม่ได้ตั้งค่า JWT_SECRET" });
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
      return res.status(404).json({ message: "ไม่พบผู้ใช้งาน" });
    }

    const user = await hydrateUser(users[0]);
    return res.status(200).json({ user });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    return res.status(error.status || 401).json({
      message: error.message || "token ไม่ถูกต้องหรือหมดอายุ",
    });
  }
});

module.exports = router;
