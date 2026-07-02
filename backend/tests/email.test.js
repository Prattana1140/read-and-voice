const test = require("node:test");
const assert = require("node:assert/strict");

const { getEmailProviderStatus, renderPasswordResetEmail } = require("../services/email");

function withEnv(values, fn) {
  const previous = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }

  try {
    fn();
  } finally {
    for (const key of Object.keys(values)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test("detects SMTP email provider", () => {
  withEnv(
    {
      RESEND_API_KEY: "",
      EMAIL_FROM: "hello@readandvoice.test",
      SMTP_HOST: "smtp.readandvoice.test",
      SMTP_PORT: "587",
      SMTP_USER: "user",
      SMTP_PASSWORD: "pass",
      PASSWORD_RESET_EMAIL_WEBHOOK_URL: "",
      EMAIL_WEBHOOK_URL: "",
    },
    () => {
      const status = getEmailProviderStatus();
      assert.equal(status.configured, true);
      assert.equal(status.provider, "smtp");
    },
  );
});

test("renders password reset email with reset URL", () => {
  const expiresAt = new Date("2026-07-02T00:00:00.000Z");
  const email = renderPasswordResetEmail({
    resetUrl: "https://example.com/forgot-password?token=abc",
    expiresAt,
  });

  assert.match(email.subject, /password/i);
  assert.match(email.text, /https:\/\/example\.com/);
  assert.match(email.html, /Choose a new password/);
});
