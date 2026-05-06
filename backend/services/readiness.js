function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function isPlaceholder(value) {
  const text = String(value || "").trim().toLowerCase();
  return (
    !text ||
    text.includes("change-this") ||
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

function getProductionReadiness() {
  const production = readEnv("NODE_ENV") === "production";
  const checks = [
    statusFromEnv("NODE_ENV"),
    statusFromEnv("JWT_SECRET"),
    statusFromEnv("API_PUBLIC_URL"),
    statusFromEnv("DB_HOST"),
    statusFromEnv("DB_USER"),
    statusFromEnv("DB_PASSWORD"),
    statusFromEnv("DB_NAME"),
  ];

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

  const emailReady = !isPlaceholder(readEnv("RESEND_API_KEY")) && !isPlaceholder(readEnv("EMAIL_FROM"));
  checks.push({
    name: "email_delivery",
    ok: emailReady,
    configured: emailReady,
    message: emailReady
      ? "Resend email delivery is configured"
      : "Set RESEND_API_KEY and EMAIL_FROM for real password reset email",
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
