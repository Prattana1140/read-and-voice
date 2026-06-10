function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function getApiPublicUrl() {
  return readEnv("API_PUBLIC_URL") || readEnv("RENDER_EXTERNAL_URL");
}

function isPlaceholder(value) {
  const text = String(value || "").trim().toLowerCase();
  return (
    !text ||
    text.includes("change-this") ||
    text.includes("replace-with") ||
    text.includes("your-") ||
    text.includes("example") ||
    ["x", "xx", "xxx", "xxxx", "xxxxx"].includes(text)
  );
}

function statusFromEnv(name, options = {}) {
  const value = readEnv(name);
  const ok = options.allowEmpty ? true : !isPlaceholder(value);
  return {
    name,
    ok,
    configured: Boolean(value),
    message: ok ? "configured" : `${name} is missing or still a placeholder`,
  };
}

function hasRealEnv(name) {
  return !isPlaceholder(readEnv(name));
}

function hasDbFieldSet(prefix) {
  const namePrefix = prefix ? `${prefix}_` : "";

  return (
    hasRealEnv(`${namePrefix}DB_HOST`) &&
    hasRealEnv(`${namePrefix}DB_USER`) &&
    hasRealEnv(`${namePrefix}DB_PASSWORD`) &&
    hasRealEnv(`${namePrefix}DB_NAME`)
  );
}

function getProductionReadiness() {
  const production = readEnv("NODE_ENV") === "production";
  const checks = [
    statusFromEnv("NODE_ENV"),
    statusFromEnv("JWT_SECRET"),
  ];

  const apiPublicUrl = getApiPublicUrl();
  checks.push({
    name: "API_PUBLIC_URL",
    ok: !isPlaceholder(apiPublicUrl),
    configured: Boolean(apiPublicUrl),
    message: !isPlaceholder(apiPublicUrl)
      ? readEnv("API_PUBLIC_URL")
        ? "configured"
        : "using RENDER_EXTERNAL_URL"
      : "API_PUBLIC_URL is missing or still a placeholder",
  });

  const hasDatabaseUrl =
    hasRealEnv("DATABASE_URL") ||
    hasRealEnv("MYSQL_URL") ||
    hasRealEnv("MYSQL_PUBLIC_URL") ||
    hasRealEnv("LOCAL_DATABASE_URL") ||
    hasRealEnv("LOCAL_MYSQL_URL") ||
    hasRealEnv("CLOUD_DATABASE_URL") ||
    hasRealEnv("CLOUD_MYSQL_URL");
  const hasDbFields = hasDbFieldSet("") || hasDbFieldSet("LOCAL") || hasDbFieldSet("CLOUD");

  checks.push({
    name: "database",
    ok: hasDatabaseUrl || hasDbFields,
    configured: hasDatabaseUrl || hasDbFields,
    message: hasDatabaseUrl
      ? "database connection string is configured"
      : hasDbFields
        ? "database host/user/password/name fields are configured"
        : "Set DATABASE_URL, DB_* fields, LOCAL_DB_* fields, or CLOUD_DB_* fields",
  });

  const frontendUrl = readEnv("FRONTEND_URL");
  const frontendLooksLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(frontendUrl);
  checks.push({
    name: "FRONTEND_URL",
    ok: !isPlaceholder(frontendUrl) && (!production || !frontendLooksLocal),
    configured: Boolean(frontendUrl),
    message:
      production && frontendLooksLocal
        ? "FRONTEND_URL points to localhost while NODE_ENV=production"
        : !isPlaceholder(frontendUrl)
          ? "configured"
          : "FRONTEND_URL is missing or still a placeholder",
  });

  const resendReady = !isPlaceholder(readEnv("RESEND_API_KEY")) && !isPlaceholder(readEnv("EMAIL_FROM"));
  const emailWebhookReady =
    !isPlaceholder(readEnv("PASSWORD_RESET_EMAIL_WEBHOOK_URL")) ||
    !isPlaceholder(readEnv("EMAIL_WEBHOOK_URL"));
  const emailReady = resendReady || emailWebhookReady;
  const passwordResetPreviewEnabled = /^(1|true|yes)$/i.test(readEnv("ALLOW_PASSWORD_RESET_PREVIEW"));
  const adminAssistedPasswordReset = !/^(1|true|yes)$/i.test(readEnv("DISABLE_ADMIN_PASSWORD_RESET"));
  checks.push({
    name: "email_delivery",
    ok: emailReady || adminAssistedPasswordReset || !production,
    configured: emailReady,
    message: resendReady
      ? "Resend email delivery is configured"
      : emailWebhookReady
        ? "email webhook delivery is configured"
        : adminAssistedPasswordReset
          ? "using admin-assisted password reset"
          : production
            ? "Set email delivery or enable admin-assisted password reset"
            : "Email delivery is not configured; password reset email is disabled in development",
  });
  checks.push({
    name: "password_reset_preview",
    ok: !production || !passwordResetPreviewEnabled,
    configured: passwordResetPreviewEnabled,
    message:
      production && passwordResetPreviewEnabled
        ? "ALLOW_PASSWORD_RESET_PREVIEW must be false in production"
        : passwordResetPreviewEnabled
          ? "preview reset links are enabled for development"
          : "preview reset links are disabled",
  });

  const gatewayReady =
    !isPlaceholder(readEnv("PAYMENT_CHECKOUT_URL_TEMPLATE")) &&
    !isPlaceholder(readEnv("PAYMENT_WEBHOOK_SECRET"));
  const manualPaymentReady =
    /^(1|true|yes)$/i.test(readEnv("MANUAL_PAYMENT_ENABLED")) &&
    !isPlaceholder(readEnv("MANUAL_PAYMENT_INSTRUCTIONS"));
  checks.push({
    name: "payment",
    ok: gatewayReady || manualPaymentReady,
    configured: gatewayReady || manualPaymentReady,
    message: gatewayReady
      ? "payment gateway checkout/webhook is configured"
      : manualPaymentReady
        ? "manual payment approval is enabled"
        : "Set payment gateway envs or enable MANUAL_PAYMENT_ENABLED with MANUAL_PAYMENT_INSTRUCTIONS",
  });

  const mockPaymentsEnabled = /^(1|true|yes)$/i.test(readEnv("ENABLE_MOCK_PAYMENTS"));
  const mockCoinTopupEnabled = /^(1|true|yes)$/i.test(readEnv("ENABLE_MOCK_COIN_TOPUP"));
  checks.push({
    name: "mock_payments",
    ok: !production || (!mockPaymentsEnabled && !mockCoinTopupEnabled),
    configured: mockPaymentsEnabled || mockCoinTopupEnabled,
    message:
      production && (mockPaymentsEnabled || mockCoinTopupEnabled)
        ? "Disable ENABLE_MOCK_PAYMENTS and ENABLE_MOCK_COIN_TOPUP in production"
        : mockPaymentsEnabled || mockCoinTopupEnabled
          ? "mock payments are enabled for development"
          : "mock payments are disabled",
  });

  const demoSeedAllowed = /^(1|true|yes)$/i.test(readEnv("ALLOW_DEMO_SEED_IN_PRODUCTION"));
  checks.push({
    name: "demo_seed_guard",
    ok: !production || !demoSeedAllowed,
    configured: demoSeedAllowed,
    message:
      production && demoSeedAllowed
        ? "ALLOW_DEMO_SEED_IN_PRODUCTION should be false before real launch"
        : "demo seed is not explicitly allowed in production",
  });

  const superAdminEmail = readEnv("SUPERADMIN_EMAIL");
  const superAdminPassword = readEnv("SUPERADMIN_PASSWORD");
  const superAdminEmailLooksDemo = /@readvoice\.local$/i.test(superAdminEmail);
  const superAdminPasswordStrong = superAdminPassword.length >= 12 && !isPlaceholder(superAdminPassword);
  checks.push({
    name: "superadmin_seed",
    ok:
      !production ||
      (!isPlaceholder(superAdminEmail) && !superAdminEmailLooksDemo && superAdminPasswordStrong),
    configured: Boolean(superAdminEmail || superAdminPassword),
    message:
      !production
        ? "superadmin seed can use local defaults in development"
        : superAdminEmailLooksDemo
          ? "SUPERADMIN_EMAIL should be a real email in production"
          : !superAdminPasswordStrong
            ? "Set SUPERADMIN_PASSWORD to a long non-placeholder password before running create:superadmin"
            : "production superadmin seed credentials are configured",
  });

  const ocrEnabled = /^(1|true|yes)$/i.test(readEnv("ENABLE_OCR") || readEnv("ENABLE_PDF_OCR"));
  checks.push({
    name: "ocr",
    ok: !ocrEnabled || !isPlaceholder(readEnv("TESSERACT_COMMAND")),
    configured: ocrEnabled,
    message: !ocrEnabled
      ? "OCR is disabled"
      : !isPlaceholder(readEnv("TESSERACT_COMMAND"))
        ? "OCR command is configured"
        : "Set TESSERACT_COMMAND when OCR is enabled",
  });

  const failed = checks.filter((check) => !check.ok);
  return {
    ready: failed.length === 0,
    checks,
    failed,
  };
}

module.exports = {
  getProductionReadiness,
};
