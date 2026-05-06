const DEFAULT_FROM_NAME = "Read and Voice";

function readEnv(name) {
  return String(process.env[name] || "").trim();
}

function getEmailFrom() {
  const from = readEnv("EMAIL_FROM");
  if (from) return from;

  const resendFrom = readEnv("RESEND_FROM_EMAIL");
  if (resendFrom) return resendFrom;

  return "";
}

function buildSender() {
  const from = getEmailFrom();
  if (!from) return "";

  if (from.includes("<")) return from;
  return `${readEnv("EMAIL_FROM_NAME") || DEFAULT_FROM_NAME} <${from}>`;
}

function isEmailConfigured() {
  return Boolean(readEnv("RESEND_API_KEY") && getEmailFrom());
}

function renderPasswordResetEmail({ resetUrl, expiresAt }) {
  const appName = readEnv("EMAIL_FROM_NAME") || DEFAULT_FROM_NAME;
  const expiresText = expiresAt.toISOString();

  return {
    subject: `Reset your ${appName} password`,
    text: [
      `We received a request to reset your ${appName} password.`,
      "",
      `Open this link to choose a new password:`,
      resetUrl,
      "",
      `This link expires at ${expiresText}.`,
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172026;max-width:560px">
        <h1 style="font-size:22px;margin:0 0 16px">Reset your ${appName} password</h1>
        <p>We received a request to reset your password.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">
            Choose a new password
          </a>
        </p>
        <p style="color:#5b6773">This link expires at ${expiresText}.</p>
        <p style="color:#5b6773">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  };
}

async function sendViaResend({ to, subject, html, text }) {
  const apiKey = readEnv("RESEND_API_KEY");
  const from = buildSender();

  if (!apiKey || !from) {
    return { delivered: false, delivery: "not_configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.message || data.error || JSON.stringify(data).slice(0, 200);
    throw new Error(`Resend email failed (${response.status}): ${message}`);
  }

  return {
    delivered: true,
    delivery: "resend",
    provider_id: data.id || null,
  };
}

async function sendViaWebhook({ to, subject, html, text, template, data }) {
  const webhookUrl = readEnv("PASSWORD_RESET_EMAIL_WEBHOOK_URL") || readEnv("EMAIL_WEBHOOK_URL");
  if (!webhookUrl) {
    return { delivered: false, delivery: "not_configured" };
  }

  const headers = {
    "Content-Type": "application/json",
  };
  const secret = readEnv("PASSWORD_RESET_EMAIL_WEBHOOK_SECRET") || readEnv("EMAIL_WEBHOOK_SECRET");
  if (secret) {
    headers["x-email-webhook-secret"] = secret;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      to,
      subject,
      html,
      text,
      template,
      data,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Email webhook failed (${response.status}): ${body.slice(0, 200)}`);
  }

  return { delivered: true, delivery: "email_webhook" };
}

async function sendEmail(message) {
  if (isEmailConfigured()) {
    return sendViaResend(message);
  }

  return sendViaWebhook(message);
}

async function sendPasswordResetEmail({ to, resetUrl, expiresAt }) {
  const content = renderPasswordResetEmail({ resetUrl, expiresAt });

  return sendEmail({
    to,
    ...content,
    template: "password_reset",
    data: {
      reset_url: resetUrl,
      expires_at: expiresAt.toISOString(),
    },
  });
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  isEmailConfigured,
};
