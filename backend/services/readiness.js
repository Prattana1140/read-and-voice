function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function getEmailFrom() {
  return readEnv("EMAIL_FROM") || readEnv("RESEND_FROM_EMAIL");
}

function getApiPublicUrl() {
  return readEnv("API_PUBLIC_URL") || readEnv("RENDER_EXTERNAL_URL");
}

function getOAuthRedirectUri(provider) {
  const providerKey = String(provider || "").toUpperCase();
  return (
    readEnv(`${providerKey}_REDIRECT_URI`) ||
    readEnv("OAUTH_REDIRECT_URI") ||
    `${getApiPublicUrl() || "http://localhost:3000"}/api/auth/oauth/${provider}/callback`
  );
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

function isLocalHttpUrl(value) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(String(value || "").trim());
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
  const apiLooksLocal = isLocalHttpUrl(apiPublicUrl);
  checks.push({
    name: "API_PUBLIC_URL",
    ok: !isPlaceholder(apiPublicUrl) && (!production || !apiLooksLocal),
    configured: Boolean(apiPublicUrl),
    message:
      production && apiLooksLocal
        ? "API_PUBLIC_URL points to localhost while NODE_ENV=production"
        : !isPlaceholder(apiPublicUrl)
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
  const frontendLooksLocal = isLocalHttpUrl(frontendUrl);
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

  const emailFrom = getEmailFrom();
  const resendReady = !isPlaceholder(readEnv("RESEND_API_KEY")) && !isPlaceholder(emailFrom);
  const smtpReady =
    !isPlaceholder(readEnv("SMTP_HOST")) &&
    !isPlaceholder(readEnv("SMTP_PORT")) &&
    !isPlaceholder(readEnv("SMTP_USER")) &&
    !isPlaceholder(readEnv("SMTP_PASSWORD")) &&
    !isPlaceholder(emailFrom);
  const emailWebhookReady =
    !isPlaceholder(readEnv("PASSWORD_RESET_EMAIL_WEBHOOK_URL")) ||
    !isPlaceholder(readEnv("EMAIL_WEBHOOK_URL"));
  const emailReady = resendReady || smtpReady || emailWebhookReady;
  const passwordResetPreviewEnabled = /^(1|true|yes)$/i.test(readEnv("ALLOW_PASSWORD_RESET_PREVIEW"));
  const adminAssistedPasswordReset = !/^(1|true|yes)$/i.test(readEnv("DISABLE_ADMIN_PASSWORD_RESET"));
  checks.push({
    name: "email_delivery",
    ok: emailReady || (!production && adminAssistedPasswordReset),
    configured: emailReady,
    message: resendReady
      ? "Resend email delivery is configured"
      : smtpReady
        ? "SMTP email delivery is configured"
        : emailWebhookReady
          ? "email webhook delivery is configured"
          : !production && adminAssistedPasswordReset
            ? "using admin-assisted password reset in development"
            : "Set Resend, SMTP, or email webhook delivery for password reset",
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

  checks.push({
    name: "mock_payments",
    ok: true,
    configured: false,
    message: "mock payment routes and mock coin top-up are removed",
  });

  checks.push({
    name: "demo_seed_guard",
    ok: true,
    configured: false,
    message: "demo user seed scripts are removed from runtime commands",
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
      !production && !superAdminEmail && !superAdminPassword
        ? "set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD before running create:superadmin"
        : superAdminEmailLooksDemo
          ? "SUPERADMIN_EMAIL should be a real email in production"
          : !superAdminPasswordStrong
            ? "Set SUPERADMIN_PASSWORD to a long non-placeholder password before running create:superadmin"
            : "superadmin seed credentials are configured",
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

  const sttEnabled = /^(1|true|yes|on)$/i.test(readEnv("ENABLE_STT"));
  const sttCommand = readEnv("STT_COMMAND");
  checks.push({
    name: "stt",
    ok: !sttEnabled || !isPlaceholder(sttCommand),
    configured: Boolean(sttCommand),
    message: !sttEnabled
      ? "STT is disabled"
      : !isPlaceholder(sttCommand)
        ? "STT command is configured"
        : "Set STT_COMMAND and STT_ARGS when ENABLE_STT=true",
  });

  const lineClientId = readEnv("LINE_CLIENT_ID");
  const lineClientSecret = readEnv("LINE_CLIENT_SECRET");
  const lineReady = !isPlaceholder(lineClientId) && !isPlaceholder(lineClientSecret);
  const lineRedirectUri = getOAuthRedirectUri("line");
  const lineRedirectLooksLocal = isLocalHttpUrl(lineRedirectUri);
  checks.push({
    name: "line_login",
    ok: !production || (lineReady && !lineRedirectLooksLocal),
    configured: lineReady,
    message:
      production && lineRedirectLooksLocal
        ? `LINE callback URL points to localhost while NODE_ENV=production: ${lineRedirectUri}`
        : lineReady
          ? `LINE login credentials are configured. Callback URL: ${lineRedirectUri}`
          : production
            ? "Set real LINE_CLIENT_ID and LINE_CLIENT_SECRET before enabling social login"
            : "LINE login credentials are not configured yet",
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
