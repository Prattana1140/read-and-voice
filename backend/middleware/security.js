const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

function readNumberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseOriginList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(origin) {
  try {
    return new URL(origin).origin;
  } catch (_error) {
    return "";
  }
}

function buildAllowedOrigins() {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    ...parseOriginList(process.env.CORS_ALLOWED_ORIGINS),
  ]
    .map(normalizeOrigin)
    .filter(Boolean);

  if (process.env.NODE_ENV === "production") {
    return new Set(configuredOrigins);
  }

  return new Set([
    ...configuredOrigins,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);
}

function createCorsOptions() {
  const allowedOrigins = buildAllowedOrigins();

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const normalizedOrigin = normalizeOrigin(origin);

      return callback(null, allowedOrigins.has(normalizedOrigin));
    },
  };
}

function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
}

function requestId(req, res, next) {
  const incomingId = String(req.headers["x-request-id"] || "").trim();
  const generatedId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  req.requestId = incomingId.slice(0, 80) || generatedId;
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  const max = options.max || 100;
  const message = options.message || "Too many requests. Please try again later.";
  const buckets = new Map();

  function cleanup(now) {
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    cleanup(now);

    const key = `${options.name || "default"}:${req.ip || req.socket.remoteAddress || "unknown"}`;
    const current = buckets.get(key);
    const bucket = current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + windowMs };

    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ message });
    }

    return next();
  };
}

function createAuthRateLimiter() {
  return createRateLimiter({
    name: "auth",
    windowMs: readNumberEnv("AUTH_RATE_LIMIT_WINDOW_MS", DEFAULT_WINDOW_MS),
    max: readNumberEnv("AUTH_RATE_LIMIT_MAX", 30),
    message: "Too many authentication attempts. Please try again later.",
  });
}

function createPaymentRateLimiter() {
  return createRateLimiter({
    name: "payment",
    windowMs: readNumberEnv("PAYMENT_RATE_LIMIT_WINDOW_MS", DEFAULT_WINDOW_MS),
    max: readNumberEnv("PAYMENT_RATE_LIMIT_MAX", 60),
    message: "Too many payment requests. Please try again later.",
  });
}

module.exports = {
  createAuthRateLimiter,
  createCorsOptions,
  createPaymentRateLimiter,
  requestId,
  securityHeaders,
};
